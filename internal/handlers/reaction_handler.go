package handlers

import (
	"net/http"
	"retro-app/internal/database"
	"retro-app/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ToggleReaction toggles a reaction on a card
func ToggleReaction(c *gin.Context) {
	cardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	var input struct {
		UserName     string `json:"user_name" binding:"required"`
		ReactionType string `json:"reaction_type" binding:"required,oneof=love celebrate idea action question"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if card exists
	var card models.Card
	if err := database.DB.First(&card, cardID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Card not found"})
		return
	}

	// Check if reaction exists
	var existingReaction models.Reaction
	err = database.DB.Where("card_id = ? AND user_name = ? AND reaction_type = ?", cardID, input.UserName, input.ReactionType).First(&existingReaction).Error

	if err == nil {
		// Reaction exists, delete it (Toggle OFF)
		if err := database.DB.Delete(&existingReaction).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove reaction"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Reaction removed", "action": "removed"})
	} else {
		// Reaction does not exist, create it (Toggle ON)
		reaction := models.Reaction{
			CardID:       cardID,
			UserName:     input.UserName,
			ReactionType: input.ReactionType,
		}
		if err := database.DB.Create(&reaction).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add reaction"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Reaction added", "action": "added", "reaction": reaction})
	}
}
