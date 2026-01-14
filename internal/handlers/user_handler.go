package handlers

import (
	"net/http"
	"github.com/bento-lab-ops/bentro/internal/database"
	"github.com/bento-lab-ops/bentro/internal/models"

	"github.com/gin-gonic/gin"
)

// SearchUsers searches for users by name or email
func SearchUsers(c *gin.Context) {
	query := c.Query("q")
	if len(query) < 2 {
		c.JSON(http.StatusOK, []models.User{})
		return
	}

	var users []models.User
	// Using ILIKE for case-insensitive search in Postgres.
	// If using SQLite during dev, ILIKE might fail if not supported, but usually LIKE is case-insensitive in SQLite by default or with config.
	// Assuming Postgres as per context imply (GORM driver).
	// Compatible search for both SQLite and Postgres
	if err := database.DB.Where("LOWER(name) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?)", "%"+query+"%", "%"+query+"%").Limit(10).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Search failed"})
		return
	}

	c.JSON(http.StatusOK, users)
}
