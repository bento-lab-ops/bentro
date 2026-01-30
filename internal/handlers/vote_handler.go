package handlers

import (
	"log"
	"net/http"

	"github.com/bento-lab-ops/bentro/internal/database"
	"github.com/bento-lab-ops/bentro/internal/models"

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

	// Check if user has ANY vote record (Active or Soft-Deleted)
	var existingVote models.Vote
	if err := database.DB.Unscoped().Where("card_id = ? AND user_name = ?", cardID, input.UserName).First(&existingVote).Error; err == nil {
		// Found a record
		if existingVote.DeletedAt.Valid {
			// It was soft-deleted (Ghost). We want to VOTE again.
			// Hard delete the ghost so we can create a fresh vote without Unique Constraint violation
			database.DB.Unscoped().Delete(&existingVote)
			// Proceed to Create logic below...
		} else {
			// It is Active. We want to UNVOTE.
			// Hard delete to remove it physically
			if err := database.DB.Unscoped().Delete(&existingVote).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove vote"})
				return
			}

			// Broadcast Update (Unvote)
			broadcastVoteUpdate(cardID)

			c.JSON(http.StatusOK, gin.H{"message": "Vote removed", "toggled": true})
			return
		}
	}

	// Check Vote Limit AND Phase
	var column models.Column
	if err := database.DB.First(&column, card.ColumnID).Error; err == nil {
		var board models.Board
		if err := database.DB.First(&board, column.BoardID).Error; err == nil {
			// Phase Check
			if board.Phase != "voting" {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Voting is closed (Phase: " + board.Phase + ")"})
				return
			}

			if board.VoteLimit > 0 {
				var totalUserVotes int64
				// Get all cards in this board
				database.DB.Model(&models.Vote{}).
					Joins("JOIN cards ON votes.card_id = cards.id").
					Joins("JOIN columns ON cards.column_id = columns.id").
					Where("columns.board_id = ? AND votes.user_name = ?", board.ID, input.UserName).
					Count(&totalUserVotes)

				if totalUserVotes >= int64(board.VoteLimit) {
					c.JSON(http.StatusForbidden, gin.H{"error": "Vote limit reached"})
					return
				}
			}
		}
	}

	if err := database.DB.Create(&vote).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add vote"})
		return
	}

	// Broadcast Update
	broadcastVoteUpdate(cardID)

	c.JSON(http.StatusCreated, vote)
}

// GetVotes retrieves all votes for a card with counts
func GetVotes(c *gin.Context) {
	cardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid card ID"})
		return
	}

	votes, likes, dislikes, isBlind := getVoteData(cardID, c.Query("user"))

	if isBlind {
		// Hide count and other votes
		c.JSON(http.StatusOK, gin.H{
			"votes":    votes, // Contains only user votes
			"likes":    -1,    // Indicator for hidden
			"dislikes": -1,
		})
		return
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

	// Fetch vote first to get CardID
	var vote models.Vote
	if err := database.DB.First(&vote, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Vote not found"})
		return
	}

	cardID := vote.CardID

	if err := database.DB.Delete(&vote).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete vote"})
		return
	}

	// Broadcast Update
	broadcastVoteUpdate(cardID)

	c.JSON(http.StatusOK, gin.H{"message": "Vote deleted successfully"})
}

// Helper to broadcast vote updates
func broadcastVoteUpdate(cardID uuid.UUID) {
	// Re-fetch data using the same logic as GetVotes
	// We need to know if it's blind voting.
	_, likes, dislikes, isBlind := getVoteData(cardID, "")

	if isBlind {
		likes = -1
		dislikes = -1
	}

	// We need the BOARD ID to broadcast to the right room/hub
	// Helper to find board ID from card
	var card models.Card
	if err := database.DB.Select("column_id").First(&card, cardID).Error; err == nil {
		var column models.Column
		if err := database.DB.Select("board_id").First(&column, card.ColumnID).Error; err == nil {
			// Use the new granular broadcast function
			BroadcastVoteUpdate(column.BoardID, cardID, likes, dislikes)
		} else {
			log.Printf("[Vote Update] Failed to find Board for Column %s: %v\n", card.ColumnID, err)
		}
	} else {
		log.Printf("[Vote Update] Failed to find Card %s: %v\n", cardID, err)
	}
}

// Helper to calculate votes
func getVoteData(cardID uuid.UUID, currentUser string) ([]models.Vote, int, int, bool) {
	var votes []models.Vote
	if err := database.DB.Where("card_id = ?", cardID).Find(&votes).Error; err != nil {
		return []models.Vote{}, 0, 0, false
	}

	// Check Board Phase for Blind Voting
	var card models.Card
	var board models.Board
	isBlindVoting := false

	if err := database.DB.First(&card, cardID).Error; err == nil {
		var column models.Column
		if err := database.DB.First(&column, card.ColumnID).Error; err == nil {
			if err := database.DB.First(&board, column.BoardID).Error; err == nil {
				if board.BlindVoting && board.Phase == "voting" {
					isBlindVoting = true
				}
			}
		}
	}

	likes := 0
	dislikes := 0
	userVotes := []models.Vote{}

	for _, vote := range votes {
		if vote.VoteType == "like" {
			likes++
		} else {
			dislikes++
		}

		// Optimization: Only gather userVotes if needed (for GetVotes response)
		if currentUser != "" && isBlindVoting {
			if vote.UserName == currentUser {
				userVotes = append(userVotes, vote)
			}
		}
	}

	if isBlindVoting && currentUser != "" {
		return userVotes, likes, dislikes, true
	} else if isBlindVoting {
		return votes, likes, dislikes, true
	}

	return votes, likes, dislikes, false
}
