package handlers

import (
	"fmt"
	"net/http"
	"github.com/bento-lab-ops/bentro/internal/database"
	"github.com/bento-lab-ops/bentro/internal/models"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm/clause"
)

// CreateBoard creates a new retrospective board
func CreateBoard(c *gin.Context) {
	var input struct {
		Name    string   `json:"name" binding:"required"`
		Columns []string `json:"columns"`
		Owner   string   `json:"owner"`
		TeamID  string   `json:"team_id"`  // Legacy: single team
		TeamIDs []string `json:"team_ids"` // New: multiple teams
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create board
	board := models.Board{
		Name:   input.Name,
		Status: "active",
		Owner:  input.Owner,
	}

	// Handle Teams (Many-to-Many)
	var teams []models.Team

	// Merge legacy TeamID into TeamIDs if present
	if input.TeamID != "" {
		input.TeamIDs = append(input.TeamIDs, input.TeamID)
	}

	// Deduplicate and Fetch Teams
	if len(input.TeamIDs) > 0 {
		// Use a map to deduplicate IDs
		uniqueIDs := make(map[string]bool)
		for _, id := range input.TeamIDs {
			if _, err := uuid.Parse(id); err == nil {
				uniqueIDs[id] = true
			}
		}

		var validIDs []string
		for id := range uniqueIDs {
			validIDs = append(validIDs, id)
		}

		if len(validIDs) > 0 {
			if err := database.DB.Where("id IN ?", validIDs).Find(&teams).Error; err != nil {
				fmt.Printf("Warning: Failed to fetch teams for board creation: %v\n", err)
			}
			board.Teams = teams

			// Set legacy TeamID to the first team for backward compatibility if needed
			// But ideally we stop using it.
			if len(teams) > 0 {
				firstTeamID := teams[0].ID
				board.TeamID = &firstTeamID
			}
		}
	}

	if err := database.DB.Create(&board).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create board"})
		return
	}

	// Auto-join the creator as a member
	member := models.BoardMember{
		BoardID:  board.ID,
		Username: input.Owner,
		JoinedAt: time.Now(),
	}
	if err := database.DB.Create(&member).Error; err != nil {
		// Log error but don't fail the request, user can join manually
		fmt.Printf("Failed to auto-join owner %s to board %s: %v\n", input.Owner, board.ID, err)
	}

	// Create default columns if none provided
	if len(input.Columns) == 0 {
		defaultColumns := []string{"What Went Well", "Needs Attention", "What Went Badly", "Action Items"}
		for i, name := range defaultColumns {
			column := models.Column{
				BoardID:  board.ID,
				Name:     name,
				Position: i,
			}
			database.DB.Create(&column)
		}
	} else {
		for i, name := range input.Columns {
			column := models.Column{
				BoardID:  board.ID,
				Name:     name,
				Position: i,
			}
			database.DB.Create(&column)
		}
	}

	// Fetch the complete board with columns
	var newBoard models.Board
	database.DB.Preload("Columns").First(&newBoard, board.ID)

	c.JSON(http.StatusCreated, newBoard)
}

// UpdateBoardStatus updates the status of a board
func UpdateBoardStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	var input struct {
		Status string `json:"status" binding:"required,oneof=active finished"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var board models.Board
	if err := database.DB.First(&board, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Board not found"})
		return
	}

	board.Status = input.Status

	// Status change logic
	now := time.Now()
	if input.Status == "finished" {
		// Finish board
		board.FinishedAt = &now
		// Do not overwrite persistent participants with active hub participants
		// participants := hub.GetBoardParticipants(id.String())
		// board.Participants = participants
	} else if input.Status == "active" {
		// Reopen board
		board.FinishedAt = nil
	}

	// Use Select to force update of FinishedAt (even if nil)
	if err := database.DB.Model(&board).Select("Status", "FinishedAt").Save(&board).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update board status"})
		return
	}

	c.JSON(http.StatusOK, board)
}

// UpdateBoard updates a board's settings (generic)
func UpdateBoard(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	var input struct {
		Name        string `json:"name"`
		VoteLimit   *int   `json:"vote_limit"`   // Use pointer to distinguish 0 from nil
		BlindVoting *bool  `json:"blind_voting"` // Use pointer to distinguish false from nil
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var board models.Board
	if err := database.DB.First(&board, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Board not found"})
		return
	}

	// Update fields if present
	if input.Name != "" {
		board.Name = input.Name
	}
	if input.VoteLimit != nil {
		board.VoteLimit = *input.VoteLimit
	}
	if input.BlindVoting != nil {
		board.BlindVoting = *input.BlindVoting
	}

	if err := database.DB.Save(&board).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update board"})
		return
	}

	// Broadcast update
	BroadcastBoardUpdate(board.ID)

	c.JSON(http.StatusOK, board)
}

// GetBoard retrieves a board with all its columns and cards
func GetBoard(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	var board models.Board
	if err := database.DB.
		Preload("Columns.Cards.Votes").
		Preload("Columns.Cards.Reactions").
		Preload("Columns.Cards.MergedCards").
		Preload("Members").
		Preload("Teams").
		First(&board, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Board not found"})
		return
	}

	// Map members to participants
	participants := make([]models.Participant, len(board.Members))
	for i, m := range board.Members {
		participants[i] = models.Participant{
			Username: m.Username,
			Avatar:   m.Avatar,
			JoinedAt: m.JoinedAt,
		}
	}
	board.Participants = participants

	c.JSON(http.StatusOK, board)
}

// ListBoards retrieves all boards with action item counts
func ListBoards(c *gin.Context) {
	// Prevent aggressive caching of board list
	c.Header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
	c.Header("Pragma", "no-cache")
	c.Header("Expires", "0")

	var boards []models.Board
	// Use Unscoped to find deleted boards for admin, but basic ListBoards usually filters them out.
	// For Admin use, we might want a separate endpoint or query param. For now, keep as is.
	// Preload members and teams
	if err := database.DB.Preload("Members").Preload("Teams").Order("created_at DESC").Find(&boards).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch boards"})
		return
	}

	// Get action item counts grouped by board
	type Result struct {
		BoardID uuid.UUID
		Count   int64
	}
	var results []Result
	database.DB.Table("cards").
		Select("columns.board_id, count(*) as count").
		Joins("join columns on cards.column_id = columns.id").
		Where("cards.is_action_item = ? AND cards.completed = ?", true, false).
		Group("columns.board_id").
		Scan(&results)

	// Map counts
	counts := make(map[uuid.UUID]int64)
	for _, r := range results {
		counts[r.BoardID] = r.Count
	}

	// Build response
	type BoardResponse struct {
		models.Board
		ActionItemCount  int64         `json:"action_item_count"`
		ParticipantCount int           `json:"participant_count"`
		TeamName         string        `json:"team_name,omitempty"` // Deprecated: Use Teams
		Teams            []models.Team `json:"teams,omitempty"`
	}

	response := make([]BoardResponse, len(boards))
	for i, b := range boards {
		// Populate participants for frontend consistency
		b.Participants = make([]models.Participant, len(b.Members))
		for j, m := range b.Members {
			b.Participants[j] = models.Participant{
				Username: m.Username,
				Avatar:   m.Avatar,
				JoinedAt: m.JoinedAt,
			}
		}

		// Count is persistent membership
		participantCount := len(b.Participants)

		// Create unified team name string for legacy support
		var teamName string
		if len(b.Teams) > 0 {
			teamName = b.Teams[0].Name
			if len(b.Teams) > 1 {
				teamName += fmt.Sprintf(" +%d", len(b.Teams)-1)
			}
		} else if b.TeamID != nil {
			// Fallback to legacy TeamID lookup if Teams relation is empty but TeamID is set
			// (Should not happen after migration, but safe to keep)
			var team models.Team
			if err := database.DB.Select("name").First(&team, b.TeamID).Error; err == nil {
				teamName = team.Name
			}
		}

		response[i] = BoardResponse{
			Board:            b,
			ActionItemCount:  counts[b.ID],
			ParticipantCount: participantCount,
			TeamName:         teamName,
			Teams:            b.Teams,
		}
	}

	c.JSON(http.StatusOK, response)
}

// DeleteBoard deletes a board
func DeleteBoard(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	// Perform soft delete
	if err := database.DB.Delete(&models.Board{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete board"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Board deleted successfully"})
}

// GetBoardParticipants retrieves the list of active participants for a board
// Now returns persistent members from DB to match Join/Leave logic
func GetBoardParticipants(c *gin.Context) {
	boardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	var members []models.BoardMember
	if err := database.DB.Where("board_id = ?", boardID).Find(&members).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch participants"})
		return
	}

	participants := make([]models.Participant, len(members))
	for i, m := range members {
		participants[i] = models.Participant{
			Username: m.Username,
			Avatar:   m.Avatar,
			JoinedAt: m.JoinedAt,
		}
	}
	// Check if any active connections are missing from DB?
	// For now, Persistent membership is the source of truth.
	// We could merge with hub.GetBoardParticipants(boardID.String()) if we wanted "Online Guests"
	// but purely DB is safer for "Joined" state consistency.

	c.JSON(http.StatusOK, participants)
}

// ClaimBoard allows a user to become the moderator of a board
func ClaimBoard(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	var input struct {
		Owner string `json:"owner" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var board models.Board
	if err := database.DB.First(&board, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Board not found"})
		return
	}

	// Dual Manager Logic
	if board.Owner != "" {
		if board.Owner == input.Owner {
			// Already owner, return success
			c.JSON(http.StatusOK, board)
			return
		}
		if board.CoOwner != "" {
			if board.CoOwner == input.Owner {
				// Already co-owner, return success
				c.JSON(http.StatusOK, board)
				return
			}
			c.JSON(http.StatusConflict, gin.H{"error": "Board already has maximum of 2 managers"})
			return
		}
		// Assign as CoOwner
		board.CoOwner = input.Owner
	} else {
		// Assign as Owner
		board.Owner = input.Owner
	}

	if err := database.DB.Save(&board).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to claim board"})
		return
	}

	c.JSON(http.StatusOK, board)
}

// UnclaimBoard allows a manager to relinquish control
func UnclaimBoard(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	var input struct {
		User string `json:"user" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var board models.Board
	if err := database.DB.First(&board, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Board not found"})
		return
	}

	if board.Owner == input.User {
		// Owner is leaving
		if board.CoOwner != "" {
			// Promote Co-Owner
			board.Owner = board.CoOwner
			board.CoOwner = ""
		} else {
			// No Co-Owner, board becomes unowned
			board.Owner = ""
		}
	} else if board.CoOwner == input.User {
		// Co-Owner is leaving
		board.CoOwner = ""
	} else {
		// User is not a manager
		c.JSON(http.StatusBadRequest, gin.H{"error": "User is not a manager of this board"})
		return
	}

	if err := database.DB.Save(&board).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unclaim board"})
		return
	}

	c.JSON(http.StatusOK, board)
}

// JoinBoard adds the current user to the board's participants
func JoinBoard(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	var input struct {
		Username string `json:"username" binding:"required"`
		Avatar   string `json:"avatar"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Double check board status (optional, but good UX)
	var board models.Board
	if err := database.DB.First(&board, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Board not found"})
		return
	}
	if board.Status == "finished" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot join a finished board"})
		return
	}

	// Create BoardMember entry
	// Using Clause(clause.OnConflict{DoNothing: true}) to handle duplicates gracefully (race condition safe)
	member := models.BoardMember{
		BoardID:  id,
		Username: input.Username,
		Avatar:   input.Avatar,
		JoinedAt: time.Now(),
	}

	if err := database.DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&member).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join board"})
		return
	}

	// Log for debug
	fmt.Printf("[JoinBoard] User %s joined board %s.\n", input.Username, id)

	// Fetch updated board with participants populating the JSON field
	var updatedBoard models.Board
	// Preload Members
	if err := database.DB.Preload("Members").First(&updatedBoard, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch updated board"})
		return
	}

	// Map members to participants for JSON response
	participants := make([]models.Participant, len(updatedBoard.Members))
	for i, m := range updatedBoard.Members {
		participants[i] = models.Participant{
			Username: m.Username,
			Avatar:   m.Avatar,
			JoinedAt: m.JoinedAt,
		}
	}
	updatedBoard.Participants = participants

	// Broadcast update
	BroadcastBoardUpdate(updatedBoard.ID)

	c.JSON(http.StatusOK, updatedBoard)
}

// LeaveBoard removes the current user from the board's participants
func LeaveBoard(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	var input struct {
		Username string `json:"username" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var board models.Board
	if err := database.DB.First(&board, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Board not found"})
		return
	}
	if board.Status == "finished" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot leave a finished board"})
		return
	}

	// Delete BoardMember
	if err := database.DB.Where("board_id = ? AND username = ?", id, input.Username).Delete(&models.BoardMember{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to leave board"})
		return
	}

	// Logic to handle Owner/CoOwner leaving
	hasChanged := false
	if board.Owner == input.Username {
		if board.CoOwner != "" {
			board.Owner = board.CoOwner
			board.CoOwner = ""
		} else {
			board.Owner = ""
		}
		hasChanged = true
	} else if board.CoOwner == input.Username {
		board.CoOwner = ""
		hasChanged = true
	}

	if hasChanged {
		if err := database.DB.Save(&board).Error; err != nil {
			fmt.Printf("Warning: Failed to update board owner after leave: %v\n", err)
		}
	}

	// Fetch updated board
	var updatedBoard models.Board
	if err := database.DB.Preload("Members").First(&updatedBoard, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch updated board"})
		return
	}

	// Map members to participants
	participants := make([]models.Participant, len(updatedBoard.Members))
	for i, m := range updatedBoard.Members {
		participants[i] = models.Participant{
			Username: m.Username,
			Avatar:   m.Avatar,
			JoinedAt: m.JoinedAt,
		}
	}
	updatedBoard.Participants = participants

	// Broadcast update
	BroadcastBoardUpdate(updatedBoard.ID)

	c.JSON(http.StatusOK, updatedBoard)
}
