package main

import (
	"log"
	"os"

	"github.com/bento-lab-ops/bentro/internal/database"
	"github.com/bento-lab-ops/bentro/internal/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

const version = "v0.16.26"

func main() {
	// Initialize database
	if err := database.InitDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Initialize WebSocket hub
	handlers.InitWebSocketHub()

	// Skip DB-dependent initialization if in Smoke Test mode
	if os.Getenv("SKIP_DB") != "true" {
		// Initialize Auth
		handlers.InitAuth()

		// Ensure admin user exists
		if err := handlers.EnsureAdminUser(); err != nil {
			log.Fatalf("Failed to ensure admin user: %v", err)
		}
	} else {
		log.Println("⚠️ Skipping Auth/Admin initialization (Smoke Test Mode)")
	}

	// Setup Gin router
	router := gin.Default()

	// CORS middleware
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Serve static files
	if os.Getenv("LOCAL_DEV") == "true" {
		log.Println("📂 Serving raw files from ./web (Local Dev Mode)")

		// Granular mapping to avoid wildcard conflicts and match Build structure:
		router.Static("/static/js", "./web/js")
		router.Static("/static/css", "./web/css")
		router.StaticFile("/static/modals.html", "./web/public/modals.html")
		router.StaticFile("/static/board-templates.json", "./web/public/board-templates.json") // Fix template 404
		router.StaticFile("/static/bentro.css", "./web/bentro.css")
		// User requested using actual logo
		router.StaticFile("/static/bentrologo.png", "./web/public/bentrologo.png")
		router.StaticFile("/static/favicon.png", "./web/static/favicon.png")

		router.StaticFile("/", "./web/index.html")
	} else {
		// Serve static files from Vite build (dist)
		// /assets is for hashed JS/CSS from Vite
		router.Static("/assets", "./web/dist/assets")
		// /static is used for legacy compat and public files (images, json, html partials)
		// Vite copies public/* to dist root. So we serve dist root as /static.
		router.Static("/static", "./web/dist")

		// Serve index.html for root
		router.StaticFile("/", "./web/dist/index.html")
	}
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API routes
	api := router.Group("/api")
	{
		// Board routes
		log.Println("Registering board routes...")
		api.GET("/boards", handlers.ListBoards)
		api.POST("/boards", handlers.CreateBoard)
		api.GET("/boards/:id", handlers.GetBoard)
		api.PUT("/boards/:id", handlers.UpdateBoard) // Add generic update
		api.DELETE("/boards/:id", handlers.DeleteBoard)
		api.POST("/boards/:id/claim", handlers.ClaimBoard)
		api.POST("/boards/:id/unclaim", handlers.UnclaimBoard)
		api.POST("/boards/:id/join", handlers.JoinBoard)
		api.POST("/boards/:id/leave", handlers.LeaveBoard)
		api.GET("/boards/:id/participants", handlers.GetBoardParticipants)
		api.PUT("/boards/:id/teams", handlers.AuthMiddleware(), handlers.UpdateBoardTeams)
		api.PUT("/boards/:id/status", handlers.AuthMiddleware(), handlers.UpdateBoardStatus)

		// Column routes
		api.POST("/boards/:id/columns", handlers.CreateColumn)
		api.PUT("/columns/:id", handlers.UpdateColumn)
		api.PUT("/columns/:id/position", handlers.UpdateColumnPosition)
		api.DELETE("/columns/:id", handlers.DeleteColumn)

		// Card routes
		api.POST("/columns/:columnId/cards", handlers.CreateCard)
		api.PUT("/cards/:id", handlers.UpdateCard)
		api.PUT("/cards/:id/move", handlers.MoveCard)
		api.POST("/cards/:id/merge", handlers.MergeCard)
		api.POST("/cards/:id/unmerge", handlers.UnmergeCard)
		api.DELETE("/cards/:id", handlers.DeleteCard)

		// Vote routes
		api.POST("/cards/:id/votes", handlers.AddVote)
		api.GET("/cards/:id/votes", handlers.GetVotes)
		api.DELETE("/votes/:id", handlers.DeleteVote)

		// Reaction routes
		api.POST("/cards/:id/reactions", handlers.ToggleReaction)

		// Global Action Items
		api.GET("/action-items", handlers.GetGlobalActionItems)

		// Admin Routes
		api.POST("/admin/login", handlers.AdminLogin)
		api.POST("/admin/boards/:id/settings", handlers.AdminUpdateBoardSettings)
		api.GET("/admin/stats", handlers.GetSystemStats)

		// User Routes (Protected)
		user := api.Group("/user")
		user.Use(handlers.AuthMiddleware())
		{
			user.GET("/me", handlers.GetCurrentUser)
		}

		users := api.Group("/users")
		users.Use(handlers.AuthMiddleware())
		{
			users.GET("/search", handlers.SearchUsers)
		}

		// Admin Routes (Protected by Auth + Admin Middleware)
		adminGroup := api.Group("/admin")
		adminGroup.Use(handlers.AuthMiddleware(), handlers.AdminMiddleware())
		{
			// User Management
			adminGroup.GET("/users", handlers.GetAllUsers)
			adminGroup.PUT("/users/:id/role", handlers.UpdateUserRole)
			adminGroup.POST("/users/:id/reset-password", handlers.ResetUserPassword)
			adminGroup.DELETE("/users/:id", handlers.DeleteUser)

			// Board Management
			adminGroup.PUT("/boards/:id/status", handlers.UpdateBoardStatus)
			adminGroup.DELETE("/boards/:id", handlers.DeleteBoard)

			// Action Item Management
			// GET /admin/action-items uses existing GetGlobalActionItems but we might want a specific admin one if filtering differs.
			// For now, reusing existing public/user endpoint is fine, but editing is admin only.
			adminGroup.PUT("/action-items/:id", handlers.AdminUpdateActionItem)
			adminGroup.DELETE("/action-items/:id", handlers.AdminDeleteActionItem)
		}

		// Team Routes (Protected)
		teams := api.Group("/teams")
		teams.Use(handlers.AuthMiddleware())
		{
			teams.POST("", handlers.CreateTeam)
			teams.GET("", handlers.GetMyTeams)
			teams.GET("/all", handlers.ListAvailableTeams)
			teams.GET("/:id", handlers.GetTeam)
			teams.PUT("/:id", handlers.UpdateTeam)
			teams.DELETE("/:id", handlers.DeleteTeam)
			teams.POST("/:id/members", handlers.AddTeamMember)
			teams.DELETE("/:id/members/:userID", handlers.RemoveTeamMember)
			teams.PUT("/:id/members/:userID/role", handlers.UpdateMemberRole)
			teams.POST("/:id/join", handlers.JoinTeam)
			teams.POST("/:id/leave", handlers.LeaveTeam)
		}
	}

	// Auth Routes
	auth := router.Group("/api/auth")
	{
		auth.POST("/register", handlers.Register)
		auth.POST("/login", handlers.Login)
		auth.POST("/logout", handlers.Logout)
		auth.POST("/change-password", handlers.AuthMiddleware(), handlers.ChangePassword)
		auth.PUT("/profile", handlers.AuthMiddleware(), handlers.UpdateProfile)
	}

	// WebSocket route
	router.GET("/ws", handlers.HandleWebSocket)

	// Start server
	port := ":8080"
	log.Printf("Server starting on port %s", port)
	if err := router.Run(port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
