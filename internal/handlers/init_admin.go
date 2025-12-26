package handlers

import (
	"fmt"
	"os"
	"retro-app/internal/database"
	"retro-app/internal/models"

	"golang.org/x/crypto/bcrypt"
)

// EnsureAdminUser creates the default admin user if it doesn't exist
func EnsureAdminUser() error {
	var adminUser models.User

	// Check if admin user already exists
	err := database.DB.Where("email = ?", "admin@system.local").First(&adminUser).Error
	if err == nil {
		// Admin user already exists
		fmt.Println("✓ Admin user already exists")
		return nil
	}

	// Get admin password from environment (same as K8s secret)
	adminPassword := os.Getenv("ADMIN_PASSWORD")
	if adminPassword == "" {
		adminPassword = "bentro" // Default password
		fmt.Println("⚠ ADMIN_PASSWORD not set, using default: bentro")
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("failed to hash admin password: %w", err)
	}

	// Create admin user
	adminUser = models.User{
		Email:                 "admin@system.local",
		DisplayName:           "admin",
		Name:                  "System Administrator",
		PasswordHash:          string(hashedPassword),
		Role:                  "admin",
		AvatarURL:             "👑",
		RequirePasswordChange: false, // Admin doesn't need to change password
	}

	if err := database.DB.Create(&adminUser).Error; err != nil {
		return fmt.Errorf("failed to create admin user: %w", err)
	}

	fmt.Println("✓ Admin user created successfully (email: admin@system.local)")
	return nil
}
