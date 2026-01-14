package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
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

// Helper to setup DB and Router for Column/Card tests
func setupColumnCardTest(t *testing.T) (*gorm.DB, *gin.Engine) {
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

	// Column Routes
	r.POST("/boards/:id/columns", CreateColumn)
	r.PUT("/columns/:id", UpdateColumn)
	r.PUT("/columns/:id/position", UpdateColumnPosition)
	r.DELETE("/columns/:id", DeleteColumn)

	// Card Routes
	r.POST("/columns/:columnId/cards", CreateCard)
	r.PUT("/cards/:id", UpdateCard)
	r.DELETE("/cards/:id", DeleteCard)
	r.PUT("/cards/:id/move", MoveCard)
	r.POST("/cards/:id/merge", MergeCard)
	r.POST("/cards/:id/unmerge", UnmergeCard)

	return db, r
}

func TestColumnCRUD(t *testing.T) {
	db, r := setupColumnCardTest(t)
	board := models.Board{ID: uuid.New(), Name: "Test Board"}
	db.Create(&board)

	// Create Column
	input := map[string]interface{}{"name": "To Do", "position": 0}
	body, _ := json.Marshal(input)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/boards/"+board.ID.String()+"/columns", bytes.NewBuffer(body))
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusCreated, w.Code)
	var col models.Column
	json.Unmarshal(w.Body.Bytes(), &col)
	assert.Equal(t, "To Do", col.Name)
	assert.Equal(t, board.ID, col.BoardID)

	// Update Column Name
	updateInput := map[string]string{"name": "Doing"}
	body2, _ := json.Marshal(updateInput)
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("PUT", "/columns/"+col.ID.String(), bytes.NewBuffer(body2))
	r.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusOK, w2.Code)

	var updatedCol models.Column
	db.First(&updatedCol, col.ID)
	assert.Equal(t, "Doing", updatedCol.Name)

	// Update Position
	posInput := map[string]int{"position": 5}
	body3, _ := json.Marshal(posInput)
	w3 := httptest.NewRecorder()
	req3, _ := http.NewRequest("PUT", "/columns/"+col.ID.String()+"/position", bytes.NewBuffer(body3))
	r.ServeHTTP(w3, req3)
	assert.Equal(t, http.StatusOK, w3.Code)

	db.First(&updatedCol, col.ID)
	assert.Equal(t, 5, updatedCol.Position)

	// Create another column to test auto-positioning logic (CreateColumn line 30)
	inputAuto := map[string]interface{}{"name": "Auto Pos"}
	bodyAuto, _ := json.Marshal(inputAuto)
	wAuto := httptest.NewRecorder()
	reqAuto, _ := http.NewRequest("POST", "/boards/"+board.ID.String()+"/columns", bytes.NewBuffer(bodyAuto))
	r.ServeHTTP(wAuto, reqAuto)

	var autoCol models.Column
	json.Unmarshal(wAuto.Body.Bytes(), &autoCol)
	// Max pos was 5, so next should be 6
	assert.Equal(t, 6, autoCol.Position)

	// Delete Column
	w4 := httptest.NewRecorder()
	req4, _ := http.NewRequest("DELETE", "/columns/"+col.ID.String(), nil)
	r.ServeHTTP(w4, req4)
	assert.Equal(t, http.StatusOK, w4.Code)

	var count int64
	db.Model(&models.Column{}).Where("id = ?", col.ID).Count(&count)
	assert.Equal(t, int64(0), count)
}

func TestCardCRUD(t *testing.T) {
	db, r := setupColumnCardTest(t)
	board := models.Board{ID: uuid.New(), Name: "Test Board"}
	db.Create(&board)
	col := models.Column{ID: uuid.New(), BoardID: board.ID, Name: "Backlog"}
	db.Create(&col)

	// Create Card
	input := map[string]interface{}{
		"content":  "Fix Bug",
		"position": 10,
		"owner":    "dev1",
	}
	body, _ := json.Marshal(input)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/columns/"+col.ID.String()+"/cards", bytes.NewBuffer(body))
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusCreated, w.Code)

	var card models.Card
	json.Unmarshal(w.Body.Bytes(), &card)
	assert.Equal(t, "Fix Bug", card.Content)
	assert.Equal(t, col.ID, card.ColumnID)

	// Update Card (Content, ActionItem, DueDate)
	newContent := "Fix Bug Updated"
	isActionItem := true
	dueDate := time.Now().Add(24 * time.Hour)

	updateInput := map[string]interface{}{
		"content":        &newContent,
		"is_action_item": &isActionItem,
		"due_date":       dueDate,
	}
	body2, _ := json.Marshal(updateInput)
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("PUT", "/cards/"+card.ID.String(), bytes.NewBuffer(body2))
	r.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusOK, w2.Code)

	var updatedCard models.Card
	db.First(&updatedCard, card.ID)
	assert.Equal(t, "Fix Bug Updated", updatedCard.Content)
	assert.True(t, updatedCard.IsActionItem)
	assert.NotNil(t, updatedCard.DueDate)

	// Delete Card
	w3 := httptest.NewRecorder()
	req3, _ := http.NewRequest("DELETE", "/cards/"+card.ID.String(), nil)
	r.ServeHTTP(w3, req3)
	assert.Equal(t, http.StatusOK, w3.Code)

	var count int64
	db.Model(&models.Card{}).Where("id = ?", card.ID).Count(&count)
	assert.Equal(t, int64(0), count)
}

func TestMoveCard(t *testing.T) {
	db, r := setupColumnCardTest(t)
	col1 := models.Column{ID: uuid.New(), Name: "Col1"}
	col2 := models.Column{ID: uuid.New(), Name: "Col2"}
	db.Create(&col1)
	db.Create(&col2)

	card := models.Card{ID: uuid.New(), ColumnID: col1.ID, Content: "Move Me", Position: 1}
	db.Create(&card)

	// Move to Col2, Pos 2
	input := map[string]interface{}{
		"column_id": col2.ID,
		"position":  2,
	}
	body, _ := json.Marshal(input)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/cards/"+card.ID.String()+"/move", bytes.NewBuffer(body))
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var movedCard models.Card
	db.First(&movedCard, card.ID)
	assert.Equal(t, col2.ID, movedCard.ColumnID)
	assert.Equal(t, 2, movedCard.Position)
}

func TestMergeAndUnmergeCard(t *testing.T) {
	db, r := setupColumnCardTest(t)
	col := models.Column{ID: uuid.New(), Name: "Col1"}
	db.Create(&col)

	parent := models.Card{ID: uuid.New(), ColumnID: col.ID, Content: "Parent"}
	child := models.Card{ID: uuid.New(), ColumnID: col.ID, Content: "Child"}
	db.Create(&parent)
	db.Create(&child)

	// Merge Child into Parent
	input := map[string]string{"target_card_id": parent.ID.String()}
	body, _ := json.Marshal(input)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/cards/"+child.ID.String()+"/merge", bytes.NewBuffer(body))
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var mergedChild models.Card
	db.First(&mergedChild, child.ID)
	assert.Equal(t, parent.ID, *mergedChild.MergedWithID)

	// Unmerge
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("POST", "/cards/"+child.ID.String()+"/unmerge", nil)
	r.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusOK, w2.Code)

	var unmergedChild models.Card
	db.First(&unmergedChild, child.ID)
	assert.Nil(t, unmergedChild.MergedWithID)
}

func TestSadPaths(t *testing.T) {
	db, r := setupColumnCardTest(t)

	// Invalid ID
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("PUT", "/columns/invalid-uuid", nil))
	assert.Equal(t, http.StatusBadRequest, w.Code)

	// Non-existent Column
	updateInput := map[string]string{"name": "Ghost"}
	body, _ := json.Marshal(updateInput)
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest("PUT", "/columns/"+uuid.New().String(), bytes.NewBuffer(body)))
	assert.Equal(t, http.StatusNotFound, w2.Code)

	// Merge with non-existent parent
	card := models.Card{ID: uuid.New(), Content: "Orphan"}
	db.Create(&card)

	mergeInput := map[string]string{"target_card_id": uuid.New().String()}
	bodyMerge, _ := json.Marshal(mergeInput)
	w3 := httptest.NewRecorder()
	req3, _ := http.NewRequest("POST", "/cards/"+card.ID.String()+"/merge", bytes.NewBuffer(bodyMerge))
	r.ServeHTTP(w3, req3)
	assert.Equal(t, http.StatusNotFound, w3.Code)
}
