package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"retro-app/internal/database"
	"retro-app/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Reusing setup logic locally for this test file to keep it self-contained
func setupAuthTestDB(t *testing.T) *gorm.DB {
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		panic(err)
	}
	err = db.AutoMigrate(&models.User{})
	if err != nil {
		panic(err)
	}
	return db
}

func setupAuthRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.Default()
	r.POST("/register", Register)
	r.POST("/login", Login)
	r.POST("/logout", Logout)

	protected := r.Group("/")
	protected.Use(AuthMiddleware())
	{
		protected.GET("/me", GetCurrentUser)
		protected.POST("/change-password", ChangePassword)
		protected.PUT("/profile", UpdateProfile)

		admin := protected.Group("/admin")
		admin.Use(AdminMiddleware())
		{
			admin.GET("/users", GetAllUsers)
			admin.PUT("/users/:id/role", UpdateUserRole)
			admin.DELETE("/users/:id", DeleteUser)
			admin.POST("/users/:id/reset-password", ResetUserPassword)
		}
	}
	return r
}

func TestRegister(t *testing.T) {
	db := setupAuthTestDB(t)
	database.DB = db
	r := setupAuthRouter()

	input := RegisterInput{
		FirstName:   "John",
		LastName:    "Doe",
		DisplayName: "johndoe",
		Email:       "john@example.com",
		Password:    "password123",
	}
	body, _ := json.Marshal(input)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/register", bytes.NewBuffer(body))
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	// Check DB
	var user models.User
	err := db.First(&user, "email = ?", input.Email).Error
	assert.NoError(t, err)
	assert.Equal(t, "John Doe", user.Name)

	// Test Duplicate
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("POST", "/register", bytes.NewBuffer(body))
	r.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusConflict, w2.Code)
}

func TestLogin(t *testing.T) {
	db := setupAuthTestDB(t)
	database.DB = db
	r := setupAuthRouter()
	InitAuth() // Initialize JWT secret

	// Create user
	hashed, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	user := models.User{
		Email:        "john@example.com",
		PasswordHash: string(hashed),
		DisplayName:  "johndoe",
		Role:         "user",
	}
	db.Create(&user)

	// Success
	input := LoginInput{Email: "john@example.com", Password: "password123"}
	body, _ := json.Marshal(input)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(body))
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "token")
	assert.Contains(t, w.Header().Get("Set-Cookie"), "auth_token")

	// Fail
	inputFail := LoginInput{Email: "john@example.com", Password: "wrong"}
	bodyFail, _ := json.Marshal(inputFail)
	wFail := httptest.NewRecorder()
	reqFail, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(bodyFail))
	r.ServeHTTP(wFail, reqFail)
	assert.Equal(t, http.StatusUnauthorized, wFail.Code)
}

func TestAuthMiddleware(t *testing.T) {
	db := setupAuthTestDB(t)
	database.DB = db
	r := setupAuthRouter()
	InitAuth()

	// 1. No Token
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/me", nil)
	r.ServeHTTP(w, req)
	// Without token, AuthMiddleware calls Next(), but GetCurrentUser checks context "user" existence
	// Wait, AuthMiddleware logic: if no token, calls Next(), but doesn't set "user".
	// GetCurrentUser logic: if "user" not in context -> 401.
	assert.Equal(t, http.StatusUnauthorized, w.Code)

	// 2. Valid Token
	hashed, _ := bcrypt.GenerateFromPassword([]byte("pass"), bcrypt.DefaultCost)
	user := models.User{ID: uuid.New(), Email: "me@test.com", PasswordHash: string(hashed), Role: "user"}
	db.Create(&user)

	// manually generate token to test middleware
	// Need to import jwt...
	// Or use Login to get token.
	loginInput := LoginInput{Email: "me@test.com", Password: "pass"}
	body, _ := json.Marshal(loginInput)
	wLogin := httptest.NewRecorder()
	reqLogin, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(body))
	r.ServeHTTP(wLogin, reqLogin)

	// Extract cookie
	cookie := wLogin.Result().Cookies()[0]

	wMe := httptest.NewRecorder()
	reqMe, _ := http.NewRequest("GET", "/me", nil)
	reqMe.AddCookie(cookie)
	r.ServeHTTP(wMe, reqMe)
	assert.Equal(t, http.StatusOK, wMe.Code)
}

func TestAdminMiddleware(t *testing.T) {
	db := setupAuthTestDB(t)
	database.DB = db
	r := setupAuthRouter()
	InitAuth()

	// Create User and Admin
	hashed, _ := bcrypt.GenerateFromPassword([]byte("pass"), bcrypt.DefaultCost)
	user := models.User{ID: uuid.New(), Email: "user@test.com", PasswordHash: string(hashed), Role: "user"}
	admin := models.User{ID: uuid.New(), Email: "admin@test.com", PasswordHash: string(hashed), Role: "admin"}
	db.Create(&user)
	db.Create(&admin)

	// User try access admin
	loginUser := LoginInput{Email: "user@test.com", Password: "pass"}
	wU := performLogin(r, loginUser)
	cookieU := wU.Result().Cookies()[0]

	wAccess1 := httptest.NewRecorder()
	req1, _ := http.NewRequest("GET", "/admin/users", nil)
	req1.AddCookie(cookieU)
	r.ServeHTTP(wAccess1, req1)
	assert.Equal(t, http.StatusForbidden, wAccess1.Code)

	// Admin access admin
	loginAdmin := LoginInput{Email: "admin@test.com", Password: "pass"}
	wA := performLogin(r, loginAdmin)
	cookieA := wA.Result().Cookies()[0]

	wAccess2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("GET", "/admin/users", nil)
	req2.AddCookie(cookieA)
	r.ServeHTTP(wAccess2, req2)
	assert.Equal(t, http.StatusOK, wAccess2.Code)
}

func performLogin(r *gin.Engine, input LoginInput) *httptest.ResponseRecorder {
	body, _ := json.Marshal(input)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(body))
	r.ServeHTTP(w, req)
	return w
}

func TestUpdateProfile(t *testing.T) {
	db := setupAuthTestDB(t)
	database.DB = db
	r := setupAuthRouter()
	InitAuth()

	// Setup user
	hashed, _ := bcrypt.GenerateFromPassword([]byte("pass"), bcrypt.DefaultCost)
	user := models.User{ID: uuid.New(), Email: "u@t.com", PasswordHash: string(hashed), DisplayName: "original"}
	db.Create(&user)
	// Another user for conflict
	other := models.User{ID: uuid.New(), Email: "o@t.com", PasswordHash: string(hashed), DisplayName: "taken"}
	db.Create(&other)

	wL := performLogin(r, LoginInput{Email: "u@t.com", Password: "pass"})
	cookie := wL.Result().Cookies()[0]

	// Success
	update := UpdateProfileInput{DisplayName: "newname"}
	body, _ := json.Marshal(update)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/profile", bytes.NewBuffer(body))
	req.AddCookie(cookie)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// Conflict
	updateConflict := UpdateProfileInput{DisplayName: "taken"}
	bodyConflict, _ := json.Marshal(updateConflict)
	wC := httptest.NewRecorder()
	reqC, _ := http.NewRequest("PUT", "/profile", bytes.NewBuffer(bodyConflict))
	reqC.AddCookie(cookie)
	r.ServeHTTP(wC, reqC)
	assert.Equal(t, http.StatusConflict, wC.Code)
}

func TestChangePassword(t *testing.T) {
	db := setupAuthTestDB(t)
	database.DB = db
	r := setupAuthRouter()
	InitAuth()

	hashed, _ := bcrypt.GenerateFromPassword([]byte("oldpass"), bcrypt.DefaultCost)
	user := models.User{ID: uuid.New(), Email: "cp@t.com", PasswordHash: string(hashed)}
	db.Create(&user)

	wL := performLogin(r, LoginInput{Email: "cp@t.com", Password: "oldpass"})
	cookie := wL.Result().Cookies()[0]

	// Wrong old pass
	changeBad := ChangePasswordInput{OldPassword: "wrong", NewPassword: "newpass"}
	bodyBad, _ := json.Marshal(changeBad)
	wB := httptest.NewRecorder()
	reqB, _ := http.NewRequest("POST", "/change-password", bytes.NewBuffer(bodyBad))
	reqB.AddCookie(cookie)
	r.ServeHTTP(wB, reqB)
	assert.Equal(t, http.StatusUnauthorized, wB.Code)

	// Success
	changeGood := ChangePasswordInput{OldPassword: "oldpass", NewPassword: "newpass"}
	bodyGood, _ := json.Marshal(changeGood)
	wG := httptest.NewRecorder()
	reqG, _ := http.NewRequest("POST", "/change-password", bytes.NewBuffer(bodyGood))
	reqG.AddCookie(cookie)
	r.ServeHTTP(wG, reqG)
	assert.Equal(t, http.StatusOK, wG.Code)

	// Verify new login
	wNew := performLogin(r, LoginInput{Email: "cp@t.com", Password: "newpass"})
	assert.Equal(t, http.StatusOK, wNew.Code)
}

func TestAdminUserManagement(t *testing.T) {
	db := setupAuthTestDB(t)
	database.DB = db
	r := setupAuthRouter()
	InitAuth()

	// Admin
	hashed, _ := bcrypt.GenerateFromPassword([]byte("pass"), bcrypt.DefaultCost)
	admin := models.User{ID: uuid.New(), Email: "adm@t.com", PasswordHash: string(hashed), Role: "admin"}
	db.Create(&admin)
	// Target User
	target := models.User{ID: uuid.New(), Email: "target@t.com", PasswordHash: string(hashed), Role: "user"}
	db.Create(&target)

	wL := performLogin(r, LoginInput{Email: "adm@t.com", Password: "pass"})
	cookie := wL.Result().Cookies()[0]

	// Update Role
	roleInput := UpdateRoleInput{Role: "admin"}
	body, _ := json.Marshal(roleInput)
	wR := httptest.NewRecorder()
	reqR, _ := http.NewRequest("PUT", "/admin/users/"+target.ID.String()+"/role", bytes.NewBuffer(body))
	reqR.AddCookie(cookie)
	r.ServeHTTP(wR, reqR)
	assert.Equal(t, http.StatusOK, wR.Code)

	// Reset Password
	wReset := httptest.NewRecorder()
	reqReset, _ := http.NewRequest("POST", "/admin/users/"+target.ID.String()+"/reset-password", nil)
	reqReset.AddCookie(cookie)
	r.ServeHTTP(wReset, reqReset)
	assert.Equal(t, http.StatusOK, wReset.Code)

	// Verify reset
	var updatedTarget models.User
	db.First(&updatedTarget, "id = ?", target.ID)
	assert.True(t, updatedTarget.RequirePasswordChange)

	// Delete User
	wDel := httptest.NewRecorder()
	reqDel, _ := http.NewRequest("DELETE", "/admin/users/"+target.ID.String(), nil)
	reqDel.AddCookie(cookie)
	r.ServeHTTP(wDel, reqDel)
	assert.Equal(t, http.StatusOK, wDel.Code)

	// Verify deleted
	err := db.First(&updatedTarget, "id = ?", target.ID).Error
	assert.Error(t, err)
}

func TestLogout(t *testing.T) {
	r := setupAuthRouter()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/logout", nil)
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Header().Get("Set-Cookie"), "auth_token=;")
}

// Helpers needed for models new UUID if not exported...
// internal/models/models.go defines BeforeCreate to make UUID.
// So we can leave ID empty when creating, OR we need the package uuid.
// models.NewUUID isn't a method, we just use uuid.New() in tests.
// Need to add "github.com/google/uuid" to imports.
