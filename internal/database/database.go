package database

import (
	"fmt"
	"log"
	"os"
	"github.com/bento-lab-ops/bentro/internal/models"

	"github.com/glebarez/sqlite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDB initializes the database connection
func InitDB() error {
	if os.Getenv("SKIP_DB") == "true" {
		log.Println("⚠️ SKIP_DB is set. Skipping database connection and migration. (Smoke Test Mode)")
		return nil
	}

	var dialector gorm.Dialector

	if os.Getenv("DB_DRIVER") == "sqlite" {
		log.Println("🛠️ Using SQLite Driver (Local Mode)")
		dialector = sqlite.Open("retro.db")
	} else {
		host := getEnv("DB_HOST", "localhost")
		port := getEnv("DB_PORT", "5432")
		user := getEnv("DB_USER", "postgres")
		password := getEnv("DB_PASSWORD", "postgres")
		dbname := getEnv("DB_NAME", "retrodb")

		dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
			host, port, user, password, dbname)
		dialector = postgres.Open(dsn)
	}

	var err error
	DB, err = gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	log.Println("Database connection established")
	log.Println("!!! I AM ALIVE v0.11.6 AND THE DB IS HERE !!!")

	// Ensure BoardMember is registered
	if !DB.Migrator().HasTable(&models.BoardMember{}) {
		log.Println("BoardMember table does not exist, creating it...")
	} else {
		log.Println("BoardMember table already exists.")
	}

	// Auto-migrate models
	if err := PerformMigrations(DB); err != nil {
		return err
	}

	log.Println("Database migration completed")

	// Migrate existing TeamID to Many-to-Many table
	MigrateLegacyData(DB)

	return nil
}

// PerformMigrations handles schema migration
func PerformMigrations(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.Board{},
		&models.Column{},
		&models.Card{},
		&models.Vote{},
		&models.Reaction{},
		&models.User{},
		&models.Team{},
		&models.TeamMember{},
		&models.BoardMember{},
	)
}

// MigrateLegacyData handles data updates for backward compatibility
func MigrateLegacyData(db *gorm.DB) {
	// This is a one-time migration for v0.10.x upgrade
	// We use raw SQL to ensure it runs even if GORM structs change later
	err := db.Exec(`
		INSERT INTO board_teams (board_id, team_id)
		SELECT id, team_id FROM boards 
		WHERE team_id IS NOT NULL 
		AND id NOT IN (SELECT board_id FROM board_teams)
	`).Error
	if err != nil {
		log.Printf("Warning: Failed to migrate legacy team_id to board_teams: %v", err)
		// Non-fatal, as it might be due to constraints or empty tables
	} else {
		log.Println("Migrated legacy team_id data to board_teams table")
	}
}

// getEnv gets environment variable with a default value
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
