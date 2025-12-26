package handlers

import (
	"net/http"
	"os"
	"retro-app/internal/database"
	"retro-app/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AdminLogin validates the admin password
func AdminLogin(c *gin.Context) {
	var input struct {
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	adminPassword := os.Getenv("ADMIN_PASSWORD")
	if adminPassword == "" {
		// Fallback for local dev if not set
		adminPassword = "bentro"
	}

	if input.Password != adminPassword {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid password"})
		return
	}

	// In a real app, we'd issue a JWT here.
	// For simplicity, we'll just return success and creating a simple session cookie on the client side
	c.JSON(http.StatusOK, gin.H{"message": "Login successful", "token": "admin-session-token"})
}

// AdminUpdateBoardSettings updates global settings or specific board settings
// This is used for changing vote limits or phases as an admin override
func AdminUpdateBoardSettings(c *gin.Context) {
	boardID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	var input struct {
		VoteLimit   *int    `json:"vote_limit"`
		Phase       *string `json:"phase"`
		BlindVoting *bool   `json:"blind_voting"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	var board models.Board
	if err := database.DB.First(&board, boardID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Board not found"})
		return
	}

	updates := map[string]interface{}{}
	if input.VoteLimit != nil {
		updates["vote_limit"] = *input.VoteLimit
	}
	if input.Phase != nil {
		updates["phase"] = *input.Phase
	}
	if input.BlindVoting != nil {
		updates["blind_voting"] = *input.BlindVoting
	}

	if err := database.DB.Model(&board).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update board settings"})
		return
	}

	// Notify via WebSocket
	BroadcastBoardUpdate(boardID)

	c.JSON(http.StatusOK, gin.H{"message": "Settings updated"})
}

// GetSystemStats returns global application statistics
func GetSystemStats(c *gin.Context) {
	var stats struct {
		TotalBoards          int64 `json:"total_boards"`
		ActiveBoards         int64 `json:"active_boards"`
		TotalActionItems     int64 `json:"total_action_items"`
		CompletedActionItems int64 `json:"completed_action_items"`
		TotalUsers           int64 `json:"total_users"` // Estimate based on distinct participants in boards
	}

	// Boards stats
	database.DB.Model(&models.Board{}).Count(&stats.TotalBoards)
	database.DB.Model(&models.Board{}).Where("status = ?", "active").Count(&stats.ActiveBoards)

	// Action Items stats
	database.DB.Model(&models.Card{}).Where("is_action_item = ?", true).Count(&stats.TotalActionItems)
	database.DB.Model(&models.Card{}).Where("is_action_item = ? AND completed = ?", true, true).Count(&stats.CompletedActionItems)

	// Approximate total users (participants are stored as JSONB, this is hard to count efficiently without a normalized table,
	// but we can count distinct names in Votes or rely on simple board count for now as a proxy or skip)
	// For now, let's just count total cards created as a proxy for activity
	var totalCards int64
	database.DB.Model(&models.Card{}).Count(&totalCards)

	c.JSON(http.StatusOK, gin.H{
		"boards": gin.H{
			"total":  stats.TotalBoards,
			"active": stats.ActiveBoards,
		},
		"action_items": gin.H{
			"total":     stats.TotalActionItems,
			"completed": stats.CompletedActionItems,
			"pending":   stats.TotalActionItems - stats.CompletedActionItems,
		},
		"activity": gin.H{
			"total_cards": totalCards,
		},
	})
}
