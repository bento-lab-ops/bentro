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

// Helper setup
func setupTeamTest(t *testing.T) (*gorm.DB, *gin.Engine) {
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		panic(err)
	}

	err = db.AutoMigrate(
		&models.User{},
		&models.Team{},
		&models.TeamMember{},
	)
	if err != nil {
		panic(err)
	}

	database.DB = db
	gin.SetMode(gin.TestMode)
	r := gin.Default()

	// Auth Middleware Simulation
	r.Use(func(c *gin.Context) {
		userID := c.GetHeader("X-User-ID")
		if userID != "" {
			uid, _ := uuid.Parse(userID)
			c.Set("user_id", uid)
		}
		role := c.GetHeader("X-User-Role")
		if role != "" {
			c.Set("user_role", role)
		}
		c.Next()
	})

	// Team Routes
	r.POST("/teams", CreateTeam)
	r.GET("/teams", ListAvailableTeams)
	r.GET("/teams/mine", GetMyTeams)
	r.GET("/teams/:id", GetTeam)
	r.PUT("/teams/:id", UpdateTeam)
	r.DELETE("/teams/:id", DeleteTeam)
	r.POST("/teams/:id/join", JoinTeam)
	r.POST("/teams/:id/leave", LeaveTeam)
	r.POST("/teams/:id/members", AddTeamMember)
	r.DELETE("/teams/:id/members/:userID", RemoveTeamMember)
	r.PUT("/teams/:id/members/:userID/role", UpdateMemberRole)

	return db, r
}

func TestTeamCRUD(t *testing.T) {
	db, r := setupTeamTest(t)
	ownerID := uuid.New()
	db.Create(&models.User{ID: ownerID, Email: "owner@test.com", Name: "Owner"})

	// 1. Create Team
	input := map[string]interface{}{
		"name":        "Test Team",
		"description": "A description",
	}
	body, _ := json.Marshal(input)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/teams", bytes.NewBuffer(body))
	req.Header.Set("X-User-ID", ownerID.String())
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
	var team models.Team
	json.Unmarshal(w.Body.Bytes(), &team)
	assert.Equal(t, "Test Team", team.Name)
	assert.Equal(t, ownerID, team.OwnerID)

	// Verify Owner Membership
	var member models.TeamMember
	db.Where("team_id = ? AND user_id = ?", team.ID, ownerID).First(&member)
	assert.Equal(t, "owner", member.Role)

	// 2. Update Team
	inputUpd := map[string]interface{}{
		"name":           "Updated Team",
		"is_invite_only": true,
	}
	bodyUpd, _ := json.Marshal(inputUpd)
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("PUT", "/teams/"+team.ID.String(), bytes.NewBuffer(bodyUpd))
	req2.Header.Set("X-User-ID", ownerID.String())
	r.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusOK, w2.Code)

	var updated models.Team
	db.First(&updated, team.ID)
	assert.Equal(t, "Updated Team", updated.Name)
	assert.True(t, updated.IsInviteOnly)

	// 3. Delete Team
	w3 := httptest.NewRecorder()
	req3, _ := http.NewRequest("DELETE", "/teams/"+team.ID.String(), nil)
	req3.Header.Set("X-User-ID", ownerID.String()) // Owner can delete
	r.ServeHTTP(w3, req3)
	assert.Equal(t, http.StatusOK, w3.Code)

	// Verify Soft Delete
	var count int64
	db.Model(&models.Team{}).Where("id = ?", team.ID).Count(&count)
	assert.Equal(t, int64(0), count) // Should be 0 with default scope (excluding deleted)
	db.Unscoped().Model(&models.Team{}).Where("id = ?", team.ID).Count(&count)
	assert.Equal(t, int64(1), count)
}

func TestTeamMembership(t *testing.T) {
	db, r := setupTeamTest(t)
	ownerID := uuid.New()
	userID := uuid.New()
	db.Create(&models.User{ID: ownerID, Email: "owner@test.com", Name: "Owner"})
	db.Create(&models.User{ID: userID, Email: "user@test.com", Name: "User"})

	team := models.Team{
		ID:           uuid.New(),
		Name:         "Public Team",
		OwnerID:      ownerID,
		IsInviteOnly: false,
	}
	db.Create(&team)
	db.Create(&models.TeamMember{TeamID: team.ID, UserID: ownerID, Role: "owner", JoinedAt: time.Now()})

	// 1. Join Public Team
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/teams/"+team.ID.String()+"/join", nil)
	req.Header.Set("X-User-ID", userID.String())
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	// 2. Leave Team
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest("POST", "/teams/"+team.ID.String()+"/leave", nil)
	req2.Header.Set("X-User-ID", userID.String())
	r.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusOK, w2.Code)

	// 3. Join Invite Only Team (Fail)
	team.IsInviteOnly = true
	db.Save(&team)

	w3 := httptest.NewRecorder()
	req3, _ := http.NewRequest("POST", "/teams/"+team.ID.String()+"/join", nil)
	req3.Header.Set("X-User-ID", userID.String())
	r.ServeHTTP(w3, req3)
	assert.Equal(t, http.StatusForbidden, w3.Code)

	// 4. Add Member (By Owner)
	inputAdd := map[string]string{"email": "user@test.com"}
	bodyAdd, _ := json.Marshal(inputAdd)
	w4 := httptest.NewRecorder()
	req4, _ := http.NewRequest("POST", "/teams/"+team.ID.String()+"/members", bytes.NewBuffer(bodyAdd))
	req4.Header.Set("X-User-ID", ownerID.String())
	r.ServeHTTP(w4, req4)
	assert.Equal(t, http.StatusCreated, w4.Code)

	// 5. Remove Member (Kick)
	w5 := httptest.NewRecorder()
	req5, _ := http.NewRequest("DELETE", "/teams/"+team.ID.String()+"/members/"+userID.String(), nil)
	req5.Header.Set("X-User-ID", ownerID.String())
	r.ServeHTTP(w5, req5)
	assert.Equal(t, http.StatusOK, w5.Code)
}

func TestTeamRoles(t *testing.T) {
	db, r := setupTeamTest(t)
	ownerID := uuid.New()
	userID := uuid.New()
	team := models.Team{ID: uuid.New(), OwnerID: ownerID}
	db.Create(&team)
	db.Create(&models.TeamMember{TeamID: team.ID, UserID: ownerID, Role: "owner"})
	db.Create(&models.TeamMember{TeamID: team.ID, UserID: userID, Role: "member"})

	// Promote Member to Owner
	input := map[string]string{"role": "owner"}
	body, _ := json.Marshal(input)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", "/teams/"+team.ID.String()+"/members/"+userID.String()+"/role", bytes.NewBuffer(body))
	req.Header.Set("X-User-ID", ownerID.String())
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var member models.TeamMember
	db.Where("team_id = ? AND user_id = ?", team.ID, userID).First(&member)
	assert.Equal(t, "owner", member.Role)
}

func TestListTeams(t *testing.T) {
	db, r := setupTeamTest(t)
	uid := uuid.New()
	t1 := models.Team{ID: uuid.New(), Name: "T1"}
	t2 := models.Team{ID: uuid.New(), Name: "T2"}
	db.Create(&t1)
	db.Create(&t2)
	db.Create(&models.TeamMember{TeamID: t1.ID, UserID: uid})

	// Get My Teams
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/teams/mine", nil)
	req.Header.Set("X-User-ID", uid.String())
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code)

	var myTeams []models.Team
	json.Unmarshal(w.Body.Bytes(), &myTeams)
	assert.Len(t, myTeams, 1)
	assert.Equal(t, "T1", myTeams[0].Name)

	// List Available Teams
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, httptest.NewRequest("GET", "/teams", nil))
	assert.Equal(t, http.StatusOK, w2.Code)

	var allTeams []models.Team
	json.Unmarshal(w2.Body.Bytes(), &allTeams)
	assert.Len(t, allTeams, 2)
}
