package handlers

import (
	"net/http"
	"retro-app/internal/database"
	"retro-app/internal/models"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CreateCard creates a new card in a column
func CreateCard(c *gin.Context) {
	columnID, err := uuid.Parse(c.Param("columnId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid column ID"})
		return
	}

	var input struct {
		Content  string `json:"content" binding:"required"`
		Position int    `json:"position"`
		Owner    string `json:"owner"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	card := models.Card{
		ColumnID: columnID,
		Content:  input.Content,
		Position: input.Position,
		Owner:    input.Owner,
	}

	if err := database.DB.Create(&card).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create card"})
		return
	}

	c.JSON(http.StatusCreated, card)
}

// UpdateCard updates a card's content and action item details
func UpdateCard(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	var input struct {
		Content        *string    `json:"content"`
		IsActionItem   *bool      `json:"is_action_item"`
		Owner          *string    `json:"owner"`
		DueDate        *time.Time `json:"due_date"`
		Completed      *bool      `json:"completed"`
		CompletionLink *string    `json:"completion_link"`
		CompletionDesc *string    `json:"completion_desc"`
		CompletionDate *time.Time `json:"completion_date"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var card models.Card
	if err := database.DB.First(&card, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Card not found"})
		return
	}

	if input.Content != nil {
		card.Content = *input.Content
	}
	if input.IsActionItem != nil {
		card.IsActionItem = *input.IsActionItem
	}
	if input.Completed != nil {
		card.Completed = *input.Completed
		// If marking as completed and date is provided, use it.
		// If cleared (false), maybe clear date? For now, we keep history unless explicitly cleared.
	}
	if input.CompletionLink != nil {
		card.CompletionLink = *input.CompletionLink
	}
	if input.CompletionDesc != nil {
		card.CompletionDesc = *input.CompletionDesc
	}
	if input.CompletionDate != nil {
		card.CompletionDate = input.CompletionDate
	}
	if input.Owner != nil {
		card.Owner = *input.Owner
	}
	if input.DueDate != nil {
		card.DueDate = input.DueDate
	}

	if err := database.DB.Save(&card).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update card"})
		return
	}

	c.JSON(http.StatusOK, card)
}

// MoveCard moves a card to a different column
func MoveCard(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	var input struct {
		ColumnID uuid.UUID `json:"column_id" binding:"required"`
		Position int       `json:"position"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var card models.Card
	if err := database.DB.First(&card, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Card not found"})
		return
	}

	card.ColumnID = input.ColumnID
	card.Position = input.Position
	if err := database.DB.Save(&card).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to move card"})
		return
	}

	c.JSON(http.StatusOK, card)
}

// MergeCard merges a card with another card
func MergeCard(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	var input struct {
		TargetCardID uuid.UUID `json:"target_card_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var card models.Card
	if err := database.DB.First(&card, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Card not found"})
		return
	}

	// Verify target card exists
	var targetCard models.Card
	if err := database.DB.First(&targetCard, input.TargetCardID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Target card not found"})
		return
	}

	// Set merged relationship
	card.MergedWithID = &input.TargetCardID
	if err := database.DB.Save(&card).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to merge card"})
		return
	}

	c.JSON(http.StatusOK, card)
}

// UnmergeCard unmerges a card from its parent
func UnmergeCard(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	var card models.Card
	if err := database.DB.First(&card, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Card not found"})
		return
	}

	// Clear merged relationship
	card.MergedWithID = nil
	if err := database.DB.Model(&card).Select("MergedWithID").Save(&card).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unmerge card"})
		return
	}

	c.JSON(http.StatusOK, card)
}

// DeleteCard deletes a card
func DeleteCard(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	if err := database.DB.Delete(&models.Card{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete card"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Card deleted successfully"})
}
