package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Participant represents a user in a board
type Participant struct {
	Username string `json:"username"`
	Avatar   string `json:"avatar"`
}

// Board represents a retrospective board
type Board struct {
	ID           uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	Name         string         `gorm:"not null" json:"name"`
	Status       string         `gorm:"default:'active'" json:"status"` // active, finished
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	Columns      []Column       `gorm:"foreignKey:BoardID;constraint:OnDelete:CASCADE" json:"columns,omitempty"`
	Participants []Participant  `gorm:"type:jsonb;serializer:json" json:"participants"`
	Phase        string         `gorm:"default:'input'" json:"phase"` // input, voting, discuss
	VoteLimit    int            `gorm:"default:0" json:"vote_limit"`  // 0 = unlimited
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate hook to generate UUID
func (b *Board) BeforeCreate(tx *gorm.DB) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return nil
}

// Column represents a column in a board
type Column struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	BoardID   uuid.UUID      `gorm:"type:uuid;not null" json:"board_id"`
	Name      string         `gorm:"not null" json:"name"`
	Position  int            `gorm:"not null" json:"position"`
	CreatedAt time.Time      `json:"created_at"`
	Cards     []Card         `gorm:"foreignKey:ColumnID;constraint:OnDelete:CASCADE" json:"cards,omitempty"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate hook to generate UUID
func (c *Column) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

// Card represents a card in a column
type Card struct {
	ID             uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	ColumnID       uuid.UUID      `gorm:"type:uuid;not null" json:"column_id"`
	Content        string         `gorm:"type:text;not null" json:"content"`
	Position       int            `gorm:"not null" json:"position"`
	MergedWithID   *uuid.UUID     `gorm:"type:uuid" json:"merged_with_id,omitempty"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	Votes          []Vote         `gorm:"foreignKey:CardID;constraint:OnDelete:CASCADE" json:"votes,omitempty"`
	Reactions      []Reaction     `gorm:"foreignKey:CardID;constraint:OnDelete:CASCADE" json:"reactions,omitempty"`
	MergedCards    []Card         `gorm:"foreignKey:MergedWithID;constraint:OnDelete:SET NULL" json:"merged_cards,omitempty"`
	IsActionItem   bool           `gorm:"default:false" json:"is_action_item"`
	Owner          string         `json:"owner,omitempty"`
	DueDate        *time.Time     `json:"due_date,omitempty"`
	CompletionLink string         `json:"completion_link,omitempty"`
	CompletionDesc string         `json:"completion_desc,omitempty"`
	CompletionDate *time.Time     `json:"completion_date,omitempty"`
	Completed      bool           `gorm:"default:false" json:"completed"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate hook to generate UUID
func (c *Card) BeforeCreate(tx *gorm.DB) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	return nil
}

// Vote represents a vote on a card
type Vote struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	CardID    uuid.UUID      `gorm:"type:uuid;not null;index:idx_card_user,unique" json:"card_id"`
	UserName  string         `gorm:"not null;index:idx_card_user,unique" json:"user_name"`
	VoteType  string         `gorm:"not null;check:vote_type IN ('like', 'dislike')" json:"vote_type"`
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate hook to generate UUID
func (v *Vote) BeforeCreate(tx *gorm.DB) error {
	if v.ID == uuid.Nil {
		v.ID = uuid.New()
	}
	return nil
}

// Reaction represents an emoji reaction on a card
type Reaction struct {
	ID           uuid.UUID      `gorm:"type:uuid;primary_key" json:"id"`
	CardID       uuid.UUID      `gorm:"type:uuid;not null;index:idx_card_user_reaction,unique" json:"card_id"`
	UserName     string         `gorm:"not null;index:idx_card_user_reaction,unique" json:"user_name"`
	ReactionType string         `gorm:"not null;index:idx_card_user_reaction,unique" json:"reaction_type"` // love, celebrate, idea, action, question
	CreatedAt    time.Time      `json:"created_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate hook to generate UUID
func (r *Reaction) BeforeCreate(tx *gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}
