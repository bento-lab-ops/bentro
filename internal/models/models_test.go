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
