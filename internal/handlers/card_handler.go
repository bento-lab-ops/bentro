package handlers

import (
	"net/http"
	"retro-app/internal/database"
	"retro-app/internal/models"

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
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	card := models.Card{
		ColumnID: columnID,
		Content:  input.Content,
		Position: input.Position,
	}

	if err := database.DB.Create(&card).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create card"})
		return
	}

	c.JSON(http.StatusCreated, card)
}

// UpdateCard updates a card's content
func UpdateCard(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	var input struct {
		Content string `json:"content" binding:"required"`
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

	card.Content = input.Content
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
	if err := database.DB.Save(&card).Error; err != nil {
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
