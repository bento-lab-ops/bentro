package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/bento-lab-ops/bentro/internal/database"
	"github.com/bento-lab-ops/bentro/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

func setupUserAdminTest(t *testing.T) (*gorm.DB, *gin.Engine) {
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		panic(err)
	}

	err = db.AutoMigrate(
		&models.User{},
		&models.Board{},
		&models.Column{},
		&models.Card{},
		&models.Team{}, // Needed for stats
	)
	if err != nil {
		panic(err)
	}

	database.DB = db
	gin.SetMode(gin.TestMode)
	r := gin.Default()

	// User Routes
	r.GET("/users/search", SearchUsers)

	// Admin Routes
	r.POST("/admin/login", AdminLogin)
	r.GET("/admin/stats", GetSystemStats)
	r.PUT("/admin/boards/:id/settings", AdminUpdateBoardSettings)

	return db, r
}

func TestSearchUsers(t *testing.T) {
	db, r := setupUserAdminTest(t)
	db.Create(&models.User{ID: uuid.New(), Name: "Alice Wonderland", Email: "alice@test.com"})
	db.Create(&models.User{ID: uuid.New(), Name: "Bob Builder", Email: "bob@test.com"})

	// Search Partial Name
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/users/search?q=Alic", nil))
	assert.Equal(t, http.StatusOK, w.Code)

	var users []models.User
	json.Unmarshal(w.Body.Bytes(), &users)
	assert.Len(t, users, 1)
	assert.Equal(t, "Alice Wonderland", users[0].Name)

	// Search Partial Email
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest("GET", "/users/search?q=bob@", nil))
	assert.Equal(t, http.StatusOK, w2.Code)

	var users2 []models.User
	json.Unmarshal(w2.Body.Bytes(), &users2)
	assert.Len(t, users2, 1)
	assert.Equal(t, "Bob Builder", users2[0].Name)

	// Search Short Query (Should return empty)
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, httptest.NewRequest("GET", "/users/search?q=a", nil))
	assert.Equal(t, http.StatusOK, w3.Code)
	var users3 []models.User
	json.Unmarshal(w3.Body.Bytes(), &users3)
	assert.Len(t, users3, 0)
}

func TestAdminLogin(t *testing.T) {
	// Set env var for test
	os.Setenv("ADMIN_PASSWORD", "secret123")
	defer os.Unsetenv("ADMIN_PASSWORD") // Cleanup

	_, r := setupUserAdminTest(t)

	// Success
	input := map[string]string{"password": "secret123"}
	body, _ := json.Marshal(input)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/admin/login", bytes.NewBuffer(body))
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// Fail
	inputFail := map[string]string{"password": "wrong"}
	bodyFail, _ := json.Marshal(inputFail)
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("POST", "/admin/login", bytes.NewBuffer(bodyFail))
	r.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusUnauthorized, w2.Code)
}

func TestAdminUpdateBoardSettings(t *testing.T) {
	db, r := setupUserAdminTest(t)
	board := models.Board{ID: uuid.New(), Name: "Admin Target", VoteLimit: 5, BlindVoting: false}
	db.Create(&board)

	// Update Settings
	newLimit := 10
	blind := true
	phase := "discuss"
	input := map[string]interface{}{
		"vote_limit":   newLimit,
		"blind_voting": blind,
		"phase":        phase,
	}
	body, _ := json.Marshal(input)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/admin/boards/"+board.ID.String()+"/settings", bytes.NewBuffer(body))
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var updated models.Board
	db.First(&updated, board.ID)
	assert.Equal(t, 10, updated.VoteLimit)
	assert.True(t, updated.BlindVoting)
	assert.Equal(t, "discuss", updated.Phase)
}

func TestGetSystemStats(t *testing.T) {
	db, r := setupUserAdminTest(t)

	// Create seed data
	db.Create(&models.Board{ID: uuid.New(), Status: "active"})
	db.Create(&models.Board{ID: uuid.New(), Status: "finished"})
	// 2 Boards

	uid := uuid.New()
	db.Create(&models.User{ID: uid})
	// 1 User

	db.Create(&models.Team{ID: uuid.New()})
	// 1 Team

	// Action Items (Cards)
	// Completed
	now := time.Now()
	db.Create(&models.Card{ID: uuid.New(), IsActionItem: true, Completed: true, CompletionDate: &now})
	// Pending
	db.Create(&models.Card{ID: uuid.New(), IsActionItem: true, Completed: false})
	// Just Card
	db.Create(&models.Card{ID: uuid.New(), IsActionItem: false})

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/admin/stats", nil))
	assert.Equal(t, http.StatusOK, w.Code)

	var stats map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &stats)

	// Verify Structure and Counts
	boards := stats["boards"].(map[string]interface{})
	assert.Equal(t, float64(2), boards["total"])
	assert.Equal(t, float64(1), boards["active"])

	users := stats["users"].(float64)
	assert.Equal(t, float64(1), users)

	teams := stats["teams"].(map[string]interface{})
	assert.Equal(t, float64(1), teams["total"])

	ais := stats["action_items"].(map[string]interface{})
	assert.Equal(t, float64(2), ais["total"])
	assert.Equal(t, float64(1), ais["completed"])
	assert.Equal(t, float64(1), ais["pending"])
}
