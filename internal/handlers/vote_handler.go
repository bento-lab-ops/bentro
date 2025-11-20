package handlers

import (
	"net/http"
	"retro-app/internal/database"
	"retro-app/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AddVote adds a vote to a card
func AddVote(c *gin.Context) {
	cardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	var input struct {
		UserName string `json:"user_name" binding:"required"`
		VoteType string `json:"vote_type" binding:"required,oneof=like dislike"`
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

	vote := models.Vote{
		CardID:   cardID,
		UserName: input.UserName,
		VoteType: input.VoteType,
	}

	// Check if user already voted on this card
	var existingVote models.Vote
	if err := database.DB.Where("card_id = ? AND user_name = ?", cardID, input.UserName).First(&existingVote).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User already voted on this card"})
		return
	}

	if err := database.DB.Create(&vote).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add vote"})
		return
	}

	c.JSON(http.StatusCreated, vote)
}

// GetVotes retrieves all votes for a card with counts
func GetVotes(c *gin.Context) {
	cardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	var votes []models.Vote
	if err := database.DB.Where("card_id = ?", cardID).Find(&votes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch votes"})
		return
	}

	// Count likes and dislikes
	likes := 0
	dislikes := 0
	for _, vote := range votes {
		if vote.VoteType == "like" {
			likes++
		} else {
			dislikes++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"votes":    votes,
		"likes":    likes,
		"dislikes": dislikes,
	})
}

// DeleteVote removes a vote
func DeleteVote(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vote ID"})
		return
	}

	if err := database.DB.Delete(&models.Vote{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete vote"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Vote deleted successfully"})
}
