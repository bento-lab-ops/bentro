package handlers

import (
	"errors"
	"net/http"
	"retro-app/internal/database"
	"retro-app/internal/models"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// CreateBoard creates a new retrospective board
func CreateBoard(c *gin.Context) {
	var input struct {
		Name    string   `json:"name" binding:"required"`
		Columns []string `json:"columns"`
		Owner   string   `json:"owner"`
		TeamID  string   `json:"team_id"`
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

	if input.TeamID != "" {
		if tid, err := uuid.Parse(input.TeamID); err == nil {
			teamID := tid
			board.TeamID = &teamID
		}
	}

	if err := database.DB.Create(&board).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create board"})
		return
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

	if err := database.DB.Save(&board).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update board status"})
		return
	}

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
		First(&board, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Board not found"})
		return
	}

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
	if err := database.DB.Order("created_at DESC").Find(&boards).Error; err != nil {
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
		ActionItemCount  int64  `json:"action_item_count"`
		ParticipantCount int    `json:"participant_count"`
		TeamName         string `json:"team_name,omitempty"`
		IsParticipant    bool   `json:"is_participant"`
	}

	// Get current user from context (if set by auth middleware) or query param for now?
	// Since ListBoards is public/protected, we might need a way to know WHO is asking.
	// For now, let's assume the frontend filters "IsParticipant" manually using the list?
	// NO, the frontend doesn't have the full list if we don't send it.
	// BUT `models.Board` struct HAS `Participants []Participant`.
	// So frontend HAS the list of participants in `b.Participants`.
	// WE DO NOT NEED `IsParticipant` in the Go struct if `Participants` is already sent!
	// Let's check `models.Board` in `models.go`. Yes, `Participants []Participant`.
	// SO `ListBoards` returns `Participants` array. Frontend can check `count` and `isParticipant`.

	// WAIT. `ListBoards` in `board_handler.go` uses `models.Board`.
	// Does `database.DB.Find(&boards)` load the JSONB field? Yes.

	// However, for ACTIVE boards, the "real-time" participants are in the HUB, but we are moving towards PERSISTENT participants.
	// If we use Persistent Participants (DB), then `b.Participants` is the source of truth for "Joined".
	// The Hub tracks "Online" users.
	// The Request was: "Join/Leave" buttons.
	// So we should use the DB list for "Membership".

	// We will sync Hub count with DB count?
	// User said: "manter o usuario ativo naquela retro ... até que a pessoa decida usar o botão leave board".
	// This implies DB persistence.

	// So `ParticipantCount` should be `len(b.Participants)` (DB) + maybe Hub online ones?
	// Let's stick to DB Participants for the "Count" on dashboard to match the "Join" button state.

	response := make([]BoardResponse, len(boards))
	for i, b := range boards {
		// Count is persistent membership
		participantCount := len(b.Participants)

		var teamName string
		if b.TeamID != nil {
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
			// IsParticipant calculated on frontend from b.Participants + current user
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
func GetBoardParticipants(c *gin.Context) {
	boardID := c.Param("id")
	if boardID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	participants := hub.GetBoardParticipants(boardID)
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

	// Transaction with locking to prevent race conditions
	err = database.DB.Transaction(func(tx *gorm.DB) error {
		var board models.Board
		// Lock the row for update
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&board, id).Error; err != nil {
			return err
		}

		if board.Status == "finished" {
			return errors.New("cannot join a finished board")
		}

		// Check if already participant
		exists := false
		for _, p := range board.Participants {
			if p.Username == input.Username {
				exists = true
				break
			}
		}

		if !exists {
			newParticipant := models.Participant{
				Username: input.Username,
				Avatar:   input.Avatar,
				JoinedAt: time.Now(),
			}
			// Append to participants list
			// Assign to a new slice to force update detection if needed, though append works usually
			board.Participants = append(board.Participants, newParticipant)

			if err := tx.Save(&board).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		if err.Error() == "cannot join a finished board" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Board not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join board"})
		}
		return
	}

	// Fetch updated board
	var updatedBoard models.Board
	database.DB.First(&updatedBoard, id)

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

	err = database.DB.Transaction(func(tx *gorm.DB) error {
		var board models.Board
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&board, id).Error; err != nil {
			return err
		}

		if board.Status == "finished" {
			return errors.New("cannot leave a finished board")
		}

		// Remove participant
		newParticipants := []models.Participant{}
		removed := false
		for _, p := range board.Participants {
			if p.Username != input.Username {
				newParticipants = append(newParticipants, p)
			} else {
				removed = true
			}
		}

		if removed {
			board.Participants = newParticipants
			if err := tx.Save(&board).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		if err.Error() == "cannot leave a finished board" {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Board not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to leave board"})
		}
		return
	}

	var updatedBoard models.Board
	database.DB.First(&updatedBoard, id)

	// Broadcast update
	BroadcastBoardUpdate(updatedBoard.ID)

	c.JSON(http.StatusOK, updatedBoard)
}
