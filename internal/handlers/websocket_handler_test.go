package handlers_test

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"retro-app/internal/database"
	"retro-app/internal/handlers"
	"retro-app/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

var startHubOnce sync.Once

func setupWSTest(t *testing.T) (*gorm.DB, *gin.Engine) {
	// Setup DB
	dsn := "file::memory:?cache=shared" // Shared cache for potentially concurrent tests
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		panic(err)
	}

	err = db.AutoMigrate(
		&models.User{},
		&models.Board{},
		&models.Column{},
		&models.Card{},
	)
	if err != nil {
		panic(err)
	}

	database.DB = db
	gin.SetMode(gin.TestMode)
	r := gin.Default()

	// Start Hub Once
	startHubOnce.Do(func() {
		handlers.InitWebSocketHub()
		time.Sleep(50 * time.Millisecond) // Warmup
	})

	r.GET("/ws", handlers.HandleWebSocket)

	return db, r
}

func TestWebSocketFlow(t *testing.T) {
	db, r := setupWSTest(t)

	// Create a Board
	boardID := uuid.New()
	db.Create(&models.Board{ID: boardID, Name: "WS Board", Status: "active"})

	// Start Test Server
	server := httptest.NewServer(r)
	defer server.Close()

	// Convert http URL to ws URL
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws"

	// Connect Client 1
	ws1, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	assert.NoError(t, err)
	defer ws1.Close()

	// Client 1 Joins Board
	joinMsg := map[string]interface{}{
		"type":     "join_board",
		"board_id": boardID.String(),
		"username": "user1",
		"avatar":   "u1.png",
	}
	err = ws1.WriteJSON(joinMsg)
	assert.NoError(t, err)

	// Verify Broadcast received (Should receive participants update)
	// We might receive the join message echo AND/OR participants update
	foundParticipants := false
	for i := 0; i < 5; i++ { // Read a few messages
		_, msg, err := ws1.ReadMessage()
		assert.NoError(t, err)

		var resp map[string]interface{}
		json.Unmarshal(msg, &resp)

		if resp["type"] == "participants_update" {
			data := resp["data"].(map[string]interface{})
			if data["board_id"] == boardID.String() {
				foundParticipants = true
				break
			}
		}
	}
	assert.True(t, foundParticipants, "Client 1 should receive participants_update")

	// Connect Client 2
	ws2, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	assert.NoError(t, err)
	defer ws2.Close()

	// Client 2 Joins
	joinMsg2 := map[string]interface{}{
		"type":     "join_board",
		"board_id": boardID.String(),
		"username": "user2",
		"avatar":   "u2.png",
	}
	ws2.WriteJSON(joinMsg2)

	// Client 1 should receive Client 2's join or update
	foundUpdate := false
	ws1.SetReadDeadline(time.Now().Add(2 * time.Second))
	for {
		_, msg, err := ws1.ReadMessage()
		if err != nil {
			break
		}
		var resp map[string]interface{}
		json.Unmarshal(msg, &resp)
		if resp["type"] == "participants_update" {
			data := resp["data"].(map[string]interface{})
			parts := data["participants"].([]interface{})
			if len(parts) >= 2 { // Should see 2 users now
				foundUpdate = true
				break
			}
		}
	}
	assert.True(t, foundUpdate, "Client 1 should see Client 2 joining")

	// Test Phase Change
	phaseMsg := map[string]interface{}{
		"type":     "phase_change",
		"board_id": boardID.String(),
		"phase":    "voting",
	}
	ws1.WriteJSON(phaseMsg)

	// Give it a moment to process DB update
	time.Sleep(100 * time.Millisecond)

	// Verify DB update
	var updatedBoard models.Board
	db.First(&updatedBoard, boardID)
	assert.Equal(t, "voting", updatedBoard.Phase)
}
