package handlers

import (
	"log"
	"net/http"

	"github.com/bento-lab-ops/bentro/internal/models"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// GetTeamAnalytics returns aggregated statistics for a team
func GetTeamAnalytics(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		teamIDStr := c.Param("id")
		teamID, err := uuid.Parse(teamIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid team ID"})
			return
		}

		userID := c.MustGet("user_id").(uuid.UUID)

		// Check if user is a member of the team
		var member models.TeamMember
		if err := db.Where("team_id = ? AND user_id = ?", teamID, userID).First(&member).Error; err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "You are not a member of this team"})
			return
		}

		var stats models.TeamStats

		// Count total boards
		if err := db.Model(&models.Board{}).Where("team_id = ?", teamID).Count(&stats.TotalBoards).Error; err != nil {
			log.Printf("Error counting boards: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate statistics"})
			return
		}

		// Count active boards
		if err := db.Model(&models.Board{}).Where("team_id = ? AND status = ?", teamID, "active").Count(&stats.ActiveBoards).Error; err != nil {
			log.Printf("Error counting active boards: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate statistics"})
			return
		}

		// Count total participants across all boards (unique users per board, summed up)
		// Note: This is a simple sum of participants. If a user is in 2 boards, they count as 2 "participations"
		// To count unique users across the whole team history, we'd need a different query.
		// For now, let's count BoardMember entries for boards belonging to this team.
		var totalParticipants int64
		if err := db.Table("board_members").
			Joins("JOIN boards ON boards.id = board_members.board_id").
			Where("boards.team_id = ?", teamID).
			Count(&totalParticipants).Error; err != nil {
			log.Printf("Error counting participants: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate statistics"})
			return
		}
		stats.TotalParticipants = totalParticipants

		// Count total action items
		var totalActionItems int64
		if err := db.Table("cards").
			Joins("JOIN columns ON columns.id = cards.column_id").
			Joins("JOIN boards ON boards.id = columns.board_id").
			Where("boards.team_id = ? AND cards.is_action_item = ?", teamID, true).
			Count(&totalActionItems).Error; err != nil {
			log.Printf("Error counting action items: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate statistics"})
			return
		}
		stats.TotalActionItems = totalActionItems

		c.JSON(http.StatusOK, stats)
	}
}
