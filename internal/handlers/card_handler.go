package handlers

import (
	"net/http"
	"time"

	"github.com/bento-lab-ops/bentro/internal/database"
	"github.com/bento-lab-ops/bentro/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
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

	// Verify column and get BoardID for broadcast
	var column models.Column
	if err := database.DB.First(&column, columnID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Column not found"})
		return
	}

	card := models.Card{
		ID:       uuid.New(),
		ColumnID: columnID,
		Content:  input.Content,
		Position: input.Position,
		Owner:    input.Owner,
	}

	if err := database.DB.Create(&card).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create card"})
		return
	}

	BroadcastBoardUpdate(column.BoardID)
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

	// Fetch BoardID for broadcast
	var column models.Column
	if err := database.DB.First(&column, card.ColumnID).Error; err == nil {
		BroadcastBoardUpdate(column.BoardID)
	}

	c.JSON(http.StatusOK, card)
}

// MoveCard moves a card to another column or position
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

	// Reordering Logic
	// 1. Get all cards in target column, ordered by position
	var cards []models.Card
	if err := database.DB.Where("column_id = ? AND deleted_at IS NULL", input.ColumnID).Order("position asc").Find(&cards).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch cards for reordering"})
		return
	}

	// 2. Remove the moved card from the slice if it exists (it might be moving within same column)
	var reorderedCards []models.Card
	for _, c := range cards {
		if c.ID != id {
			reorderedCards = append(reorderedCards, c)
		}
	}

	// 3. Insert the card at the new position
	if input.Position < 0 {
		input.Position = 0
	}
	if input.Position > len(reorderedCards) {
		input.Position = len(reorderedCards)
	}

	// Insert
	reorderedCards = append(reorderedCards[:input.Position], append([]models.Card{card}, reorderedCards[input.Position:]...)...)

	// 4. Submit updates in transaction
	err = database.DB.Transaction(func(tx *gorm.DB) error {
		for i, c := range reorderedCards {
			if c.Position != i || c.ColumnID != input.ColumnID {
				if err := tx.Model(&models.Card{}).Where("id = ?", c.ID).Updates(map[string]interface{}{
					"position":  i,
					"column_id": input.ColumnID,
				}).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reorder cards"})
		return
	}

	// Check target column and get BoardID (for broadcast)
	var targetColumn models.Column
	if err := database.DB.First(&targetColumn, input.ColumnID).Error; err == nil {
		BroadcastBoardUpdate(targetColumn.BoardID)
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

	// Broadcast
	var column models.Column
	if err := database.DB.First(&column, card.ColumnID).Error; err == nil {
		BroadcastBoardUpdate(column.BoardID)
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

	// Broadcast
	var column models.Column
	if err := database.DB.First(&column, card.ColumnID).Error; err == nil {
		BroadcastBoardUpdate(column.BoardID)
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

	// Need to get card first to get column ID for broadcast
	var card models.Card
	if err := database.DB.First(&card, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Card not found"})
		return
	}

	var column models.Column
	// Best effort to get column for board ID
	database.DB.First(&column, card.ColumnID)

	if err := database.DB.Delete(&models.Card{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete card"})
		return
	}

	if column.ID != uuid.Nil {
		BroadcastBoardUpdate(column.BoardID)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Card deleted successfully"})
}
