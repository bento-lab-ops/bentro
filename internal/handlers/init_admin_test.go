package handlers

import (
	"fmt"
	"os"
	"github.com/bento-lab-ops/bentro/internal/database"
	"github.com/bento-lab-ops/bentro/internal/models"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	// Use unique in-memory SQLite for each test
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		panic(err)
	}
	// Migration
	err = db.AutoMigrate(&models.User{})
	if err != nil {
		panic(err)
	}
	return db
}

func TestEnsureAdminUser_CreateNew(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	database.DB = db

	// Ensure clean state
	db.Exec("DELETE FROM users")

	// 1. Test Default Password
	os.Unsetenv("ADMIN_PASSWORD")
	err := EnsureAdminUser()
	assert.NoError(t, err)

	var user models.User
	err = db.Where("email = ?", "admin@system.local").First(&user).Error
	assert.NoError(t, err)
	assert.Equal(t, "admin", user.DisplayName)
	assert.Equal(t, "admin", user.Role)

	// Verify default password checking
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte("bentro"))
	assert.NoError(t, err)
}

func TestEnsureAdminUser_AlreadyExists(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	database.DB = db

	// Create admin manually with different password
	hashed, _ := bcrypt.GenerateFromPassword([]byte("existing_pass"), bcrypt.DefaultCost)
	existingAdmin := models.User{
		Email:        "admin@system.local",
		PasswordHash: string(hashed),
		DisplayName:  "Old Admin",
	}
	db.Create(&existingAdmin)

	// Run function
	err := EnsureAdminUser()
	assert.NoError(t, err)

	// Verify not changed
	var user models.User
	err = db.Where("email = ?", "admin@system.local").First(&user).Error
	assert.NoError(t, err)
	assert.Equal(t, "Old Admin", user.DisplayName)

	// Verify old password works
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte("existing_pass"))
	assert.NoError(t, err)
}

func TestEnsureAdminUser_CustomPassword(t *testing.T) {
	// Setup
	db := setupTestDB(t)
	database.DB = db
	db.Exec("DELETE FROM users")

	// Set Env
	os.Setenv("ADMIN_PASSWORD", "secret123")
	defer os.Unsetenv("ADMIN_PASSWORD")

	// Run
	err := EnsureAdminUser()
	assert.NoError(t, err)

	var user models.User
	err = db.Where("email = ?", "admin@system.local").First(&user).Error
	assert.NoError(t, err)

	// Verify custom password
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte("secret123"))
	assert.NoError(t, err)
}
