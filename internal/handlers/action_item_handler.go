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
		ID             uuid.UUID  `json:"id"`
		Content        string     `json:"content"`
		IsActionItem   bool       `json:"is_action_item"`
		Owner          string     `json:"owner"`
		DueDate        *time.Time `json:"due_date"`
		Completed      bool       `json:"completed"`
		CompletionDate *time.Time `json:"completion_date"`
		CompletionLink string     `json:"completion_link"`
		CompletionDesc string     `json:"completion_desc"`
		CreatedAt      time.Time  `json:"created_at"`
		BoardName      string     `json:"board_name"`
		BoardID        uuid.UUID  `json:"board_id"`
		BoardDeleted   bool       `json:"board_deleted"`
	}

	results := []ActionItemResult{}

	// Query with Unscoped() to include soft-deleted boards
	query := database.DB.Table("cards").
		Select("cards.id, cards.content, cards.is_action_item, cards.owner, cards.due_date, cards.completed, cards.completion_date, cards.completion_link, cards.completion_desc, cards.created_at, boards.name as board_name, boards.id as board_id, boards.deleted_at IS NOT NULL as board_deleted").
		Joins("JOIN columns ON cards.column_id = columns.id").
		Joins("JOIN boards ON columns.board_id = boards.id").
		Where("cards.is_action_item = ?", true)

	// Since we are using manual joins, GORM might not automatically apply DeletedAt check for boards table if we don't use model structs in joins.
	// But usually `DeletedAt` is handled by GORM when querying Models.
	// Here we are querying Table("cards"), so we explicitly control the query.
	// By default, a manual JOIN on a table with soft delete (boards) WILL include deleted rows unless filtered.
	// In the previous version we HAD explicit .Where("boards.deleted_at IS NULL").
	// NOW we remove it to INCLUDE them.

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
