package handlers

import (
	"net/http"
	"github.com/bento-lab-ops/bentro/internal/database"
	"github.com/bento-lab-ops/bentro/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// CreateColumn creates a new column in a board
func CreateColumn(c *gin.Context) {
	boardID, err := uuid.Parse(c.Param("id")) // Using "id" to avoid conflict with other /boards/:id routes
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid board ID"})
		return
	}

	var input struct {
		Name     string `json:"name" binding:"required"`
		Position int    `json:"position"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Calculate position: if not provided (0), append to end
	if input.Position == 0 {
		var maxPos int
		result := database.DB.Model(&models.Column{}).
			Where("board_id = ?", boardID).
			Select("COALESCE(MAX(position), -1)"). // Used -1 so that first col becomes 0
			Scan(&maxPos)

		if result.Error == nil {
			input.Position = maxPos + 1
		}
	}

	column := models.Column{
		BoardID:  boardID,
		Name:     input.Name,
		Position: input.Position,
	}

	if err := database.DB.Create(&column).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create column"})
		return
	}

	c.JSON(http.StatusCreated, column)
}

// UpdateColumn updates a column's name
func UpdateColumn(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid column ID"})
		return
	}

	var input struct {
		Name string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var column models.Column
	if err := database.DB.First(&column, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Column not found"})
		return
	}

	column.Name = input.Name
	if err := database.DB.Save(&column).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update column"})
		return
	}

	c.JSON(http.StatusOK, column)
}

// UpdateColumnPosition updates a column's position
func UpdateColumnPosition(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid column ID"})
		return
	}

	var input struct {
		Position int `json:"position" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var column models.Column
	if err := database.DB.First(&column, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Column not found"})
		return
	}

	column.Position = input.Position
	if err := database.DB.Save(&column).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update column position"})
		return
	}

	c.JSON(http.StatusOK, column)
}

// DeleteColumn deletes a column
func DeleteColumn(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid column ID"})
		return
	}

	if err := database.DB.Delete(&models.Column{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete column"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Column deleted successfully"})
}
