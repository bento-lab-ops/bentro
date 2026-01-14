package handlers

import (
	"net/http"
	"github.com/bento-lab-ops/bentro/internal/database"
	"github.com/bento-lab-ops/bentro/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// UpdateBoardTeams updates the list of teams associated with a board
func UpdateBoardTeams(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	var input struct {
		TeamIDs []string `json:"team_ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify Board existence and User permissions
	var board models.Board
	if err := database.DB.First(&board, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Board not found"})
		return
	}

	// Get current user from context (set by AuthMiddleware)
	userObj, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	user := userObj.(models.User)

	// Check permissions (Owner, Co-Owner, or Admin)
	isOwner := board.Owner == user.DisplayName || board.Owner == user.Name
	isCoOwner := board.CoOwner != "" && (board.CoOwner == user.DisplayName || board.CoOwner == user.Name)
	isAdmin := user.Role == "admin"

	if !isOwner && !isCoOwner && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only board managers can update teams"})
		return
	}

	// Fetch Teams to ensure they exist/validate
	var teams []models.Team
	if len(input.TeamIDs) > 0 {
		if err := database.DB.Where("id IN ?", input.TeamIDs).Find(&teams).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch teams"})
			return
		}
	}

	// Update Association
	if err := database.DB.Model(&board).Association("Teams").Replace(&teams); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update board teams"})
		return
	}

	// Return updated board with teams
	database.DB.Preload("Teams").First(&board, id)

	c.JSON(http.StatusOK, board)
}
