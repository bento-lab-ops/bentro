package main

import (
	"log"
	"retro-app/internal/database"
	"retro-app/internal/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize database
	if err := database.InitDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Initialize WebSocket hub
	handlers.InitWebSocketHub()

	// Initialize Auth
	handlers.InitAuth()

	// Ensure admin user exists
	if err := handlers.EnsureAdminUser(); err != nil {
		log.Fatalf("Failed to ensure admin user: %v", err)
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
	router.Static("/static", "./web")
	router.StaticFile("/", "./web/index.html")

	// API routes
	api := router.Group("/api")
	{
		// Board routes
		log.Println("Registering board routes...")
		api.POST("/boards", handlers.CreateBoard)
		api.GET("/boards/:id", handlers.GetBoard)
		api.GET("/boards", handlers.ListBoards)
		api.PUT("/boards/:id/status", handlers.UpdateBoardStatus)
		api.DELETE("/boards/:id", handlers.DeleteBoard)
		api.GET("/boards/:id/participants", handlers.GetBoardParticipants)
		api.POST("/boards/:id/claim", handlers.ClaimBoard)
		api.POST("/boards/:id/unclaim", handlers.UnclaimBoard)

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

		// Admin User Management Routes
		adminUsers := api.Group("/admin/users")
		adminUsers.Use(handlers.AuthMiddleware(), handlers.AdminMiddleware())
		{
			adminUsers.GET("", handlers.GetAllUsers)
			adminUsers.PUT("/:id/role", handlers.UpdateUserRole)
			adminUsers.POST("/:id/reset-password", handlers.ResetUserPassword)
			adminUsers.DELETE("/:id", handlers.DeleteUser)
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
