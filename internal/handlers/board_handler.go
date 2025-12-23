package handlers

import (
	"net/http"
	"retro-app/internal/database"
	"retro-app/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CreateBoard creates a new retrospective board
func CreateBoard(c *gin.Context) {
	var input struct {
		Name    string   `json:"name" binding:"required"`
		Columns []string `json:"columns"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create board
	board := models.Board{
		Name:   input.Name,
		Status: "active",
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

	// If finishing board, save participants
	if input.Status == "finished" {
		participants := hub.GetBoardParticipants(id.String())
		board.Participants = participants
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
	var boards []models.Board
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
		ActionItemCount int64 `json:"action_item_count"`
	}

	response := make([]BoardResponse, len(boards))
	for i, b := range boards {
		response[i] = BoardResponse{
			Board:           b,
			ActionItemCount: counts[b.ID],
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
