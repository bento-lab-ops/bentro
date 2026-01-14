package models

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

// Mock DB for hook testing (if needed, but BeforeCreate usually just needs the struct)
// Actually BeforeCreate signature is (tx *gorm.DB) error.
// We can pass nil if the function doesn't use the DB instance, which ours don't (they just set ID).

func TestUser_BeforeCreate(t *testing.T) {
	u := &User{
		DisplayName: "testuser",
		Email:       "test@example.com",
	}

	// UUID should be Nil initially
	assert.Equal(t, uuid.Nil, u.ID)

	// Call Hook
	err := u.BeforeCreate(nil)

	// Assertions
	assert.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, u.ID, "User ID should be generated")
}

func TestBoard_BeforeCreate(t *testing.T) {
	b := &Board{
		Name:      "Retrospective",
		CreatedAt: time.Now(),
	}

	assert.Equal(t, uuid.Nil, b.ID)

	err := b.BeforeCreate(nil)

	assert.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, b.ID, "Board ID should be generated")
}

func TestColumn_BeforeCreate(t *testing.T) {
	c := &Column{Name: "Todo"}
	assert.Equal(t, uuid.Nil, c.ID)
	err := c.BeforeCreate(nil)
	assert.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, c.ID)
}

func TestCard_BeforeCreate(t *testing.T) {
	c := &Card{Content: "Test"}
	assert.Equal(t, uuid.Nil, c.ID)
	err := c.BeforeCreate(nil)
	assert.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, c.ID)
}

func TestVote_BeforeCreate(t *testing.T) {
	v := &Vote{VoteType: "like"}
	assert.Equal(t, uuid.Nil, v.ID)
	err := v.BeforeCreate(nil)
	assert.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, v.ID)
}

func TestReaction_BeforeCreate(t *testing.T) {
	r := &Reaction{ReactionType: "love"}
	assert.Equal(t, uuid.Nil, r.ID)
	err := r.BeforeCreate(nil)
	assert.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, r.ID)
}

func TestTeam_BeforeCreate(t *testing.T) {
	tm := &Team{Name: "Dream Team"}
	assert.Equal(t, uuid.Nil, tm.ID)
	err := tm.BeforeCreate(nil)
	assert.NoError(t, err)
	assert.NotEqual(t, uuid.Nil, tm.ID)
}

func TestHooks_DoNotOverwriteExistingID(t *testing.T) {
	// Setup with pre-defined UUID
	id := uuid.New()
	
	u := &User{ID: id}
	_ = u.BeforeCreate(nil)
	assert.Equal(t, id, u.ID)

	b := &Board{ID: id}
	_ = b.BeforeCreate(nil)
	assert.Equal(t, id, b.ID)
	
	c := &Column{ID: id}
	_ = c.BeforeCreate(nil)
	assert.Equal(t, id, c.ID)

	cd := &Card{ID: id}
	_ = cd.BeforeCreate(nil)
	assert.Equal(t, id, cd.ID)

	v := &Vote{ID: id}
	_ = v.BeforeCreate(nil)
	assert.Equal(t, id, v.ID)

	r := &Reaction{ID: id}
	_ = r.BeforeCreate(nil)
	assert.Equal(t, id, r.ID)

	tm := &Team{ID: id}
	_ = tm.BeforeCreate(nil)
	assert.Equal(t, id, tm.ID)
}
