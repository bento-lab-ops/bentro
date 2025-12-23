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
		adminPassword = "admin"
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
		VoteLimit *int    `json:"vote_limit"`
		Phase     *string `json:"phase"`
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

	if err := database.DB.Model(&board).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update board settings"})
		return
	}

	// Notify via WebSocket
	BroadcastBoardUpdate(boardID)

	c.JSON(http.StatusOK, gin.H{"message": "Settings updated"})
}
