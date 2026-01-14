package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/bento-lab-ops/bentro/internal/database"
	"github.com/bento-lab-ops/bentro/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"
)

// Helper setup
func setupVoteReactionTest(t *testing.T) (*gorm.DB, *gin.Engine) {
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
		&models.Vote{},
		&models.Reaction{},
	)
	if err != nil {
		panic(err)
	}

	database.DB = db
	gin.SetMode(gin.TestMode)
	r := gin.Default()

	// Vote Routes
	r.POST("/cards/:id/votes", AddVote)
	r.GET("/cards/:id/votes", GetVotes)
	r.DELETE("/votes/:id", DeleteVote)

	// Reaction Routes
	r.POST("/cards/:id/reactions", ToggleReaction)

	return db, r
}

func TestVoteFlow(t *testing.T) {
	db, r := setupVoteReactionTest(t)

	// Setup Board, Column, Card
	board := models.Board{ID: uuid.New(), Name: "Vote Board", Phase: "voting"} // Phase must be voting
	db.Create(&board)
	col := models.Column{ID: uuid.New(), BoardID: board.ID, Name: "Col1"}
	db.Create(&col)
	card := models.Card{ID: uuid.New(), ColumnID: col.ID, Content: "Votable"}
	db.Create(&card)

	// 1. Add Vote (Like)
	input := map[string]string{"user_name": "user1", "vote_type": "like"}
	body, _ := json.Marshal(input)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/cards/"+card.ID.String()+"/votes", bytes.NewBuffer(body))
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var vote models.Vote
	db.Where("card_id = ? AND user_name = ?", card.ID, "user1").First(&vote)
	assert.Equal(t, "like", vote.VoteType)

	// 2. Toggle Vote (Remove) - sending same request again should toggle it off
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req) // Re-use request? No, Body is consumed.

	w2 = httptest.NewRecorder()
	req2, _ := http.NewRequest("POST", "/cards/"+card.ID.String()+"/votes", bytes.NewBuffer(body))
	r.ServeHTTP(w2, req2)

	assert.Equal(t, http.StatusOK, w2.Code)
	var resp map[string]interface{}
	json.Unmarshal(w2.Body.Bytes(), &resp)
	assert.Equal(t, "Vote removed", resp["message"])
	assert.Equal(t, true, resp["toggled"])

	var count int64
	db.Model(&models.Vote{}).Where("card_id = ? AND user_name = ?", card.ID, "user1").Count(&count)
	assert.Equal(t, int64(0), count)

	// 3. Vote Limit
	board.VoteLimit = 1
	db.Save(&board)

	// User2 votes
	input2 := map[string]string{"user_name": "user2", "vote_type": "like"}
	body2, _ := json.Marshal(input2)
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, httptest.NewRequest("POST", "/cards/"+card.ID.String()+"/votes", bytes.NewBuffer(body2)))
	assert.Equal(t, http.StatusCreated, w3.Code)

	// User2 tries to vote again on SAME card -> Toggle OFF (Allowed even at limit? Yes, removing vote reduces count)
	// Wait, if I try to vote on another card, I should be blocked.

	card2 := models.Card{ID: uuid.New(), ColumnID: col.ID, Content: "Another"}
	db.Create(&card2)

	w4 := httptest.NewRecorder()
	r.ServeHTTP(w4, httptest.NewRequest("POST", "/cards/"+card2.ID.String()+"/votes", bytes.NewBuffer(body2)))
	assert.Equal(t, http.StatusForbidden, w4.Code) // Limit reached
}

func TestGetVotesBlind(t *testing.T) {
	db, r := setupVoteReactionTest(t)
	board := models.Board{ID: uuid.New(), Name: "Blind Board", Phase: "voting", BlindVoting: true}
	db.Create(&board)
	col := models.Column{ID: uuid.New(), BoardID: board.ID}
	db.Create(&col)
	card := models.Card{ID: uuid.New(), ColumnID: col.ID}
	db.Create(&card)

	// Add votes
	db.Create(&models.Vote{CardID: card.ID, UserName: "me", VoteType: "like"})
	db.Create(&models.Vote{CardID: card.ID, UserName: "other", VoteType: "like"})

	// Get Votes as "me"
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/cards/"+card.ID.String()+"/votes?user=me", nil))
	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	assert.Equal(t, float64(-1), resp["likes"]) // Hidden
	votes := resp["votes"].([]interface{})
	assert.Equal(t, 1, len(votes)) // Only my vote

	// Open voting phase -> Blind reveal
	board.Phase = "discuss"
	db.Save(&board)

	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest("GET", "/cards/"+card.ID.String()+"/votes?user=me", nil))

	json.Unmarshal(w2.Body.Bytes(), &resp)
	assert.Equal(t, float64(2), resp["likes"]) // Revealed
}

func TestReactionFlow(t *testing.T) {
	db, r := setupVoteReactionTest(t)
	card := models.Card{ID: uuid.New(), Content: "React Me"}
	db.Create(&card)

	// Toggle On
	input := map[string]string{"user_name": "user1", "reaction_type": "love"}
	body, _ := json.Marshal(input)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/cards/"+card.ID.String()+"/reactions", bytes.NewBuffer(body))
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var reaction models.Reaction
	db.First(&reaction)
	assert.Equal(t, "love", reaction.ReactionType)

	// Toggle Off
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest("POST", "/cards/"+card.ID.String()+"/reactions", bytes.NewBuffer(body)))
	assert.Equal(t, http.StatusOK, w2.Code)

	var count int64
	db.Model(&models.Reaction{}).Count(&count)
	assert.Equal(t, int64(0), count)

	// Invalid Type
	inputBad := map[string]string{"user_name": "user1", "reaction_type": "hate"}
	bodyBad, _ := json.Marshal(inputBad)
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, httptest.NewRequest("POST", "/cards/"+card.ID.String()+"/reactions", bytes.NewBuffer(bodyBad)))
	assert.Equal(t, http.StatusBadRequest, w3.Code)
}
