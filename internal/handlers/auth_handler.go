package handlers

import (
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/bento-lab-ops/bentro/internal/database"
	"github.com/bento-lab-ops/bentro/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	jwtSecret = []byte(os.Getenv("JWT_SECRET"))
)

// InitAuth initializes auth config
func InitAuth() {
	if len(jwtSecret) == 0 {
		jwtSecret = []byte("default-dev-secret-change-me")
	}
}

type RegisterInput struct {
	FirstName   string `json:"first_name" binding:"required"`
	LastName    string `json:"last_name" binding:"required"`
	DisplayName string `json:"display_name" binding:"required,min=3"`
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=6"`
	Avatar      string `json:"avatar"`
}

type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// Register creates a new user
func Register(c *gin.Context) {
	var input RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Hash Password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	user := models.User{
		Name:         input.FirstName + " " + input.LastName,
		DisplayName:  input.DisplayName,
		Email:        input.Email,
		PasswordHash: string(hashedPassword),
		AvatarURL:    input.Avatar,
		Role:         "user", // Default role
		LastLogin:    time.Now(),
	}

	// Save to DB
	if err := database.DB.Create(&user).Error; err != nil {
		// Return the actual error for debugging E2E tests
		c.JSON(http.StatusConflict, gin.H{"error": fmt.Sprintf("Registration failed: %v", err)})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "User registered successfully", "user": user})
}

// Login authenticates a user
func Login(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		}
		return
	}

	// Verify Password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Check if password is default "bentro" and user is not admin
	requirePasswordChange := false
	if input.Password == "bentro" && user.Role != "admin" {
		requirePasswordChange = true
		user.RequirePasswordChange = true
	}

	// Update LastLogin
	user.LastLogin = time.Now()
	database.DB.Save(&user)

	// Generate JWT
	jwtToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID.String(),
		"role":    user.Role,
		"exp":     time.Now().Add(time.Hour * 24 * 15).Unix(), // 15 days
	})

	tokenString, err := jwtToken.SignedString(jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Set Cookie (15 days)
	// Secure should be true in production (HTTPS)
	c.SetCookie("auth_token", tokenString, 3600*24*15, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"token":                   tokenString,
		"user":                    user,
		"require_password_change": requirePasswordChange,
	})
}

// Logout clears the session
func Logout(c *gin.Context) {
	c.SetCookie("auth_token", "", -1, "/", "", false, true)
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

type ChangePasswordInput struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

// ChangePassword allows users to change their password
func ChangePassword(c *gin.Context) {
	// Get user from context (set by AuthMiddleware)
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}
	user := userInterface.(models.User)

	var input ChangePasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify old password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.OldPassword)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Current password is incorrect"})
		return
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Update password and clear RequirePasswordChange flag
	user.PasswordHash = string(hashedPassword)
	user.RequirePasswordChange = false
	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}

type UpdateProfileInput struct {
	DisplayName string `json:"display_name" binding:"omitempty,min=3"`
	AvatarURL   string `json:"avatar_url" binding:"omitempty"`
}

// UpdateProfile allows users to update their profile (display name, avatar)
func UpdateProfile(c *gin.Context) {
	// Get user from context (set by AuthMiddleware)
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}
	user := userInterface.(models.User)

	var input UpdateProfileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields if provided
	if input.DisplayName != "" {
		// Check if display name is already taken by another user
		var existingUser models.User
		if err := database.DB.Where("display_name = ? AND id != ?", input.DisplayName, user.ID).First(&existingUser).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Display name already taken"})
			return
		}
		user.DisplayName = input.DisplayName
	}

	if input.AvatarURL != "" {
		user.AvatarURL = input.AvatarURL
	}

	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully", "user": user})
}

// GetCurrentUser returns the current logged in user
func GetCurrentUser(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not logged in"})
		return
	}
	c.JSON(http.StatusOK, user)
}

// AdminMiddleware checks if user has admin role
func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("user_role")
		fmt.Printf("AdminMiddleware - role exists: %v, role value: %v\n", exists, role)
		if !exists || role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// GetAllUsers returns all registered users (admin only)
func GetAllUsers(c *gin.Context) {
	var users []models.User
	if err := database.DB.Order("created_at DESC").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}
	c.JSON(http.StatusOK, users)
}

type UpdateRoleInput struct {
	Role string `json:"role" binding:"required,oneof=user admin"`
}

// UpdateUserRole changes a user's role (admin only)
func UpdateUserRole(c *gin.Context) {
	userID := c.Param("id")

	var input UpdateRoleInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	user.Role = input.Role
	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update role"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Role updated successfully", "user": user})
}

// ResetUserPassword resets a user's password to "bentro" (admin only)
func ResetUserPassword(c *gin.Context) {
	userID := c.Param("id")

	var user models.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Hash default password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("bentro"), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	user.PasswordHash = string(hashedPassword)
	user.RequirePasswordChange = true
	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reset password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password reset to 'bentro'. User will be required to change it on next login."})
}

// DeleteUser deletes a user (admin only)
func DeleteUser(c *gin.Context) {
	userID := c.Param("id")

	var user models.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Prevent deleting yourself
	currentUserID, _ := c.Get("user_id")
	if currentUserID == user.ID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete your own account"})
		return
	}

	if err := database.DB.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

// AuthMiddleware - standard JWT middleware
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString, err := c.Cookie("auth_token")
		if err != nil {
			// Check Authorization header as fallback
			authHeader := c.GetHeader("Authorization")
			if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
				tokenString = authHeader[7:]
			}
		}

		if tokenString == "" {
			fmt.Println("AuthMiddleware: No token found")
			c.Next()
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			fmt.Printf("AuthMiddleware: Invalid token - err: %v, valid: %v\n", err, token != nil && token.Valid)
			c.Next()
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			userIDStr, ok := claims["user_id"].(string)
			if ok {
				var user models.User
				if err := database.DB.First(&user, "id = ?", userIDStr).Error; err == nil {
					fmt.Printf("AuthMiddleware: Setting user_role to: %s for user: %s\n", user.Role, user.Email)
					c.Set("user", user)
					c.Set("user_id", user.ID)
					c.Set("user_role", user.Role)
				} else {
					fmt.Printf("AuthMiddleware: Failed to find user: %v\n", err)
				}
			}
		}

		c.Next()
	}
}
