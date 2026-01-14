package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"retro-app/internal/database"
	"retro-app/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

// Helper to setup DB and Router for Board tests
func setupBoardTest(t *testing.T) (*gorm.DB, *gin.Engine) {
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		panic(err)
	}

	// Migrate all related models
	err = db.AutoMigrate(
		&models.User{},
		&models.Board{},
		&models.Column{},
		&models.Card{},
		&models.Team{},
		&models.BoardMember{},
	)
	if err != nil {
		panic(err)
	}

	database.DB = db

	gin.SetMode(gin.TestMode)
	r := gin.Default()

	// Register routes needed for testing
	r.POST("/boards", CreateBoard)
	r.GET("/boards", ListBoards)
	r.GET("/boards/:id", GetBoard)
	r.PUT("/boards/:id", UpdateBoard)
	r.DELETE("/boards/:id", DeleteBoard)
	r.PUT("/boards/:id/status", UpdateBoardStatus) // Mocking Auth requirement? Or just test handler directly?
	// The original main.go uses AuthMiddleware for UpdateBoardStatus.
	// For unit testing the handler logic, we can skip middleware or mock it.
	// Here we test the handler logic directly without middleware for simplicity,
	// assumming middleware is tested in auth_handler_test.

	r.POST("/boards/:id/claim", ClaimBoard)
	r.POST("/boards/:id/unclaim", UnclaimBoard)
	r.POST("/boards/:id/join", JoinBoard)
	r.POST("/boards/:id/leave", LeaveBoard)

	return db, r
}

func TestCreateBoard(t *testing.T) {
	db, r := setupBoardTest(t)

	// Happy Path
	input := map[string]interface{}{
		"name":  "Retrospective 1",
		"owner": "alice",
	}
	body, _ := json.Marshal(input)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/boards", bytes.NewBuffer(body))
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var response models.Board
	json.Unmarshal(w.Body.Bytes(), &response)
	assert.Equal(t, "Retrospective 1", response.Name)
	assert.Equal(t, "active", response.Status)
	assert.Equal(t, "alice", response.Owner)
	// Check default columns
	assert.Len(t, response.Columns, 4)

	// Check DB
	var board models.Board
	err := db.Preload("Columns").First(&board, response.ID).Error
	assert.NoError(t, err)
	assert.Equal(t, "Retrospective 1", board.Name)
	assert.Len(t, board.Columns, 4)

	// Verify Owner auto-joined
	var member models.BoardMember
	err = db.Where("board_id = ? AND username = ?", board.ID, "alice").First(&member).Error
	assert.NoError(t, err)

	// Test with Custom Columns and Teams
	team := models.Team{ID: uuid.New(), Name: "Team Alpha"}
	db.Create(&team)

	input2 := map[string]interface{}{
		"name":     "Custom Board",
		"owner":    "bob",
		"columns":  []string{"Start", "Stop", "Continue"},
		"team_ids": []string{team.ID.String()},
	}
	body2, _ := json.Marshal(input2)
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("POST", "/boards", bytes.NewBuffer(body2))
	r.ServeHTTP(w2, req2)

	assert.Equal(t, http.StatusCreated, w2.Code)
	var response2 models.Board
	json.Unmarshal(w2.Body.Bytes(), &response2)
	assert.Len(t, response2.Columns, 3)

	// Verify Team association (need to reload from DB as response might imply it but checking DB is safer)
	var board2 models.Board
	db.Preload("Teams").First(&board2, response2.ID)
	assert.Len(t, board2.Teams, 1)
	assert.Equal(t, "Team Alpha", board2.Teams[0].Name)
}

func TestGetBoard(t *testing.T) {
	db, r := setupBoardTest(t)

	board := models.Board{ID: uuid.New(), Name: "Get Me"}
	db.Create(&board)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/boards/"+board.ID.String(), nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp models.Board
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "Get Me", resp.Name)

	// Not Found
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("GET", "/boards/"+uuid.New().String(), nil)
	r.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusNotFound, w2.Code)
}

func TestUpdateBoardStatus(t *testing.T) {
	db, r := setupBoardTest(t)
	board := models.Board{ID: uuid.New(), Name: "Status Board", Status: "active"}
	db.Create(&board)

	// Finish Board
	input := map[string]string{"status": "finished"}
	body, _ := json.Marshal(input)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/boards/"+board.ID.String()+"/status", bytes.NewBuffer(body))
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var updated models.Board
	db.First(&updated, board.ID)
	assert.Equal(t, "finished", updated.Status)
	assert.NotNil(t, updated.FinishedAt)

	// Reopen Board
	input2 := map[string]string{"status": "active"}
	body2, _ := json.Marshal(input2)
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("PUT", "/boards/"+board.ID.String()+"/status", bytes.NewBuffer(body2))
	r.ServeHTTP(w2, req2)

	assert.Equal(t, http.StatusOK, w2.Code)
	var reopened models.Board
	db.First(&reopened, board.ID)
	assert.Equal(t, "active", reopened.Status)
	assert.Nil(t, reopened.FinishedAt)
}

func TestUpdateBoardSettings(t *testing.T) {
	db, r := setupBoardTest(t)
	board := models.Board{ID: uuid.New(), Name: "Old Name", VoteLimit: 5, BlindVoting: false}
	db.Create(&board)

	limit := 10
	blind := true
	input := map[string]interface{}{
		"name":         "New Name",
		"vote_limit":   limit,
		"blind_voting": blind,
	}
	body, _ := json.Marshal(input)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/boards/"+board.ID.String(), bytes.NewBuffer(body))
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var updated models.Board
	db.First(&updated, board.ID)
	assert.Equal(t, "New Name", updated.Name)
	assert.Equal(t, 10, updated.VoteLimit)
	assert.True(t, updated.BlindVoting)
}

func TestJoinAndLeaveBoard(t *testing.T) {
	db, r := setupBoardTest(t)
	board := models.Board{ID: uuid.New(), Name: "Community Board", Status: "active"}
	db.Create(&board)

	// Join
	input := map[string]string{"username": "user1", "avatar": "img.png"}
	body, _ := json.Marshal(input)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/boards/"+board.ID.String()+"/join", bytes.NewBuffer(body))
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var count int64
	db.Model(&models.BoardMember{}).Where("board_id = ?", board.ID).Count(&count)
	assert.Equal(t, int64(1), count)

	// Leave
	leaveInput := map[string]string{"username": "user1"}
	leaveBody, _ := json.Marshal(leaveInput)
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("POST", "/boards/"+board.ID.String()+"/leave", bytes.NewBuffer(leaveBody))
	r.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusOK, w2.Code)

	db.Model(&models.BoardMember{}).Where("board_id = ?", board.ID).Count(&count)
	assert.Equal(t, int64(0), count)

	// Test Join Finished Board (Fail)
	board.Status = "finished"
	db.Save(&board)

	w3 := httptest.NewRecorder()
	req3, _ := http.NewRequest("POST", "/boards/"+board.ID.String()+"/join", bytes.NewBuffer(body))
	r.ServeHTTP(w3, req3)
	assert.Equal(t, http.StatusBadRequest, w3.Code)
}

func TestClaimAndUnclaimBoard(t *testing.T) {
	db, r := setupBoardTest(t)
	board := models.Board{ID: uuid.New(), Name: "Orphan Board"}
	db.Create(&board)

	// Claim
	input := map[string]string{"owner": "manager1"}
	body, _ := json.Marshal(input)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/boards/"+board.ID.String()+"/claim", bytes.NewBuffer(body))
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var b models.Board
	db.First(&b, board.ID)
	assert.Equal(t, "manager1", b.Owner)

	// Co-Claim
	input2 := map[string]string{"owner": "manager2"}
	body2, _ := json.Marshal(input2)
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("POST", "/boards/"+board.ID.String()+"/claim", bytes.NewBuffer(body2))
	r.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusOK, w2.Code)

	db.First(&b, board.ID)
	assert.Equal(t, "manager2", b.CoOwner)

	// Unclaim Owner
	unclaim := map[string]string{"user": "manager1"}
	body3, _ := json.Marshal(unclaim)
	w3 := httptest.NewRecorder()
	req3, _ := http.NewRequest("POST", "/boards/"+board.ID.String()+"/unclaim", bytes.NewBuffer(body3))
	r.ServeHTTP(w3, req3)
	assert.Equal(t, http.StatusOK, w3.Code)

	db.First(&b, board.ID)
	// Manager 2 promoted to Owner
	assert.Equal(t, "manager2", b.Owner)
	assert.Empty(t, b.CoOwner)
}

func TestDeleteBoard(t *testing.T) {
	db, r := setupBoardTest(t)
	board := models.Board{ID: uuid.New(), Name: "Temp Board"}
	db.Create(&board)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", "/boards/"+board.ID.String(), nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	// Verify Deep Soft Delete? Or just board gone?
	// GORM Defaul delete is soft delete if DeletedAt exists
	var count int64
	db.Model(&models.Board{}).Where("id = ?", board.ID).Count(&count)
	assert.Equal(t, int64(0), count)

	// Unscoped check
	db.Unscoped().Model(&models.Board{}).Where("id = ?", board.ID).Count(&count)
	assert.Equal(t, int64(1), count)
}
