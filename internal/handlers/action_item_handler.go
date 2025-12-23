package handlers

import (
	"net/http"
	"retro-app/internal/database"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetGlobalActionItems retrieves all action items across all boards
func GetGlobalActionItems(c *gin.Context) {
	completedParam := c.Query("completed")
	ownerParam := c.Query("owner")

	type ActionItemResult struct {
		ID           uuid.UUID  `json:"id"`
		Content      string     `json:"content"`
		IsActionItem bool       `json:"is_action_item"`
		Owner        string     `json:"owner"`
		DueDate      *time.Time `json:"due_date"`
		Completed    bool       `json:"completed"`
		CreatedAt    time.Time  `json:"created_at"`
		BoardName    string     `json:"board_name"`
		BoardID      uuid.UUID  `json:"board_id"`
	}

	var results []ActionItemResult

	query := database.DB.Table("cards").
		Select("cards.id, cards.content, cards.is_action_item, cards.owner, cards.due_date, cards.completed, cards.created_at, boards.name as board_name, boards.id as board_id").
		Joins("JOIN columns ON cards.column_id = columns.id").
		Joins("JOIN boards ON columns.board_id = boards.id").
		Where("cards.is_action_item = ?", true).
		Where("boards.deleted_at IS NULL") // Explicitly ignore deleted boards (though GORM usually handles this on join if models have DeletedAt, but raw joins might not)

	if completedParam != "" {
		query = query.Where("cards.completed = ?", completedParam == "true")
	}

	if ownerParam != "" {
		query = query.Where("cards.owner = ?", ownerParam)
	}

	// Order by due date (nulls last) and then created_at
	query = query.Order("cards.completed ASC, cards.due_date ASC NULLS LAST, cards.created_at DESC")

	if err := query.Scan(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch action items"})
		return
	}

	c.JSON(http.StatusOK, results)
}
