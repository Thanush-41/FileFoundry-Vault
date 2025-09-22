package main

import (
	"log"
	"net/http"

	"file-vault-system/backend/internal/config"
	"file-vault-system/backend/internal/handlers"
	"file-vault-system/backend/internal/middleware"
	"file-vault-system/backend/internal/services"
	"file-vault-system/backend/pkg/database"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Set Gin to debug mode for detailed logging
	gin.SetMode(gin.DebugMode)

	// Load environment variables - try multiple paths
	envPaths := []string{".env", "../../.env", "../../../.env"}
	for _, path := range envPaths {
		if err := godotenv.Load(path); err == nil {
			log.Printf("Loaded .env from: %s", path)
			break
		}
	}

	// Load configuration
	cfg := config.Load()

	// Initialize database
	db, err := database.Initialize(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Run database migrations
	if err := database.RunMigrations(db, cfg); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize services
	auditService := services.NewAuditService(db)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(db, cfg)
	fileHandler := handlers.NewFileHandler(db, cfg, auditService)
	folderHandler := handlers.NewFolderHandler(db, cfg)
	adminHandler := handlers.NewAdminHandler(db, cfg, auditService)

	// Initialize sharing service and handler
	sharingService := services.NewSharingService(db)
	sharingHandler := handlers.NewSharingHandler(sharingService)

	// Initialize folder sharing service and handler
	folderSharingService := services.NewFolderSharingService(db)
	folderSharingHandler := handlers.NewFolderSharingHandler(db, folderSharingService)

	// Set up Gin router
	router := gin.Default()
	router.Use(middleware.CORS())

	// Initialize rate limiter with config
	if cfg.EnableRateLimit {
		middleware.InitializeRateLimiter(cfg)
		if cfg.RateLimitMode == "database" {
			router.Use(middleware.DatabaseRateLimit(db, cfg))
		} else {
			router.Use(middleware.RateLimit())
		}
	}

	// Add quota info to all authenticated responses
	router.Use(middleware.QuotaInfoMiddleware(db))

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"version": "1.0.0",
		})
	})

	// API routes
	api := router.Group("/api/v1")
	{
		// Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", middleware.AuthMiddleware(), authHandler.Logout)
			auth.GET("/me", middleware.AuthMiddleware(), authHandler.GetMe)
		}

		// Protected file routes
		files := api.Group("/files")
		files.Use(middleware.AuthMiddleware())

		// Apply storage quota and file size limits to upload endpoints
		if cfg.EnableQuotaCheck {
			files.Use(middleware.StorageQuotaMiddleware(db, cfg))
			files.Use(middleware.FileUploadSizeLimit(cfg))
		}

		{
			files.POST("/upload", fileHandler.UploadFile)
			files.GET("/", fileHandler.ListFiles)
			files.POST("/search", fileHandler.SearchFiles) // Advanced search endpoint
			files.GET("/public", fileHandler.GetPublicFiles)
			files.GET("/stats", fileHandler.GetUserStats)
			files.GET("/download-stats", fileHandler.GetFileDownloadStats)
			files.GET("/:id", fileHandler.GetFile)
			files.GET("/:id/view", fileHandler.ViewFile)
			files.GET("/:id/download", fileHandler.DownloadFile)
			files.POST("/:id/move", fileHandler.MoveFile)
			files.DELETE("/:id", fileHandler.DeleteFile)

			// File sharing routes
			files.POST("/:id/share", sharingHandler.ShareFileWithUser)
			files.POST("/:id/share-link", sharingHandler.CreateShareLink)
			files.GET("/:id/shares", sharingHandler.GetFileShares)
		}

		// Sharing routes under /api/v1
		api.GET("/shared-files", middleware.AuthMiddleware(), sharingHandler.GetSharedFiles)
		api.GET("/shared-folders", middleware.AuthMiddleware(), folderSharingHandler.GetSharedFolders)
		api.GET("/share-links", middleware.AuthMiddleware(), sharingHandler.GetShareLinks)
		api.GET("/folder-share-links", middleware.AuthMiddleware(), folderSharingHandler.GetFolderShareLinks)
		api.DELETE("/shares/:id", middleware.AuthMiddleware(), sharingHandler.RevokeFileShare)
		api.DELETE("/folder-shares/:id", middleware.AuthMiddleware(), folderSharingHandler.RemoveFolderShare)
		api.DELETE("/share-links/:id", middleware.AuthMiddleware(), sharingHandler.RevokeShareLink)
		api.DELETE("/folder-share-links/:id", middleware.AuthMiddleware(), folderSharingHandler.RemoveFolderShareLink)

		// Protected folder routes
		folders := api.Group("/folders")
		folders.Use(middleware.AuthMiddleware())
		{
			folders.POST("/", folderHandler.CreateFolder)
			folders.GET("/", folderHandler.ListFolders)
			folders.GET("/tree", folderHandler.GetFolderTree)
			folders.GET("/:id", folderHandler.GetFolder)
			folders.PUT("/:id", folderHandler.UpdateFolder)
			folders.POST("/:id/move", folderHandler.MoveFolder)
			folders.DELETE("/:id", folderHandler.DeleteFolder)

			// Folder sharing routes
			folders.POST("/:id/share", folderSharingHandler.ShareFolderWithUser)
			folders.POST("/:id/share-link", folderSharingHandler.CreateFolderShareLink)
			folders.GET("/:id/shares", folderSharingHandler.GetFolderShares)
		}

		// Admin routes
		admin := api.Group("/admin")
		admin.Use(middleware.AuthMiddleware())
		admin.Use(middleware.RequireAdmin())
		admin.Use(middleware.DatabaseMiddleware(db))
		{
			admin.GET("/stats", adminHandler.GetStats)
			admin.GET("/users", adminHandler.GetUsers)
			admin.GET("/users/:id", adminHandler.GetUserDetails)
			admin.GET("/files", adminHandler.GetAllFilesWithStats)
			admin.GET("/files/:id/stats", adminHandler.GetFileStats)
			admin.GET("/files/:id/view", adminHandler.ViewFileAsAdmin)
			admin.GET("/files/:id/download", adminHandler.DownloadFileAsAdmin)

			// Admin file upload with quota and size limits
			if cfg.EnableQuotaCheck {
				admin.POST("/files/upload", middleware.StorageQuotaMiddleware(db, cfg), middleware.FileUploadSizeLimit(cfg), adminHandler.UploadFileAsAdmin)
			} else {
				admin.POST("/files/upload", adminHandler.UploadFileAsAdmin)
			}

			admin.POST("/files/:id/share", adminHandler.ShareFileAsAdmin)
			admin.GET("/users/:id/files", adminHandler.GetUserFiles)
			admin.POST("/files/:id/make-public", adminHandler.MakeFilePublic)
			admin.POST("/files/:id/make-private", adminHandler.MakeFilePrivate)

			// Deduplication routes
			admin.GET("/deduplication/summary", adminHandler.GetUserDeduplicationSummary)
			admin.GET("/deduplication/users/:userId", adminHandler.GetUserDeduplicationDetails)

			// Analytics routes
			admin.GET("/analytics/overview", handlers.GetAnalyticsOverview)
			admin.GET("/analytics/user-registration-trend", handlers.GetUserRegistrationTrend)
			admin.GET("/analytics/file-upload-trend", handlers.GetFileUploadTrend)
			admin.GET("/analytics/download-trend", handlers.GetDownloadTrend)
			admin.GET("/analytics/file-type-distribution", handlers.GetFileTypeDistribution)
			admin.GET("/analytics/top-files", handlers.GetTopFiles)
			admin.GET("/analytics/user-activity", handlers.GetUserActivity)
			admin.GET("/analytics/storage-usage-trend", handlers.GetStorageUsageTrend)
		}
	}

	// Public sharing routes (no auth required)
	router.GET("/share/:token", sharingHandler.AccessSharedFile)
	router.GET("/share/:token/download", sharingHandler.DownloadSharedFile)
	router.GET("/folder-share/:token", folderSharingHandler.AccessSharedFolderByLink)

	// Public file routes (no auth required)
	router.GET("/public-files/:id/view", fileHandler.ViewPublicFile)
	router.GET("/public-files/:id/download", fileHandler.DownloadPublicFile)

	log.Printf("Server starting on port %s", cfg.Port)
	log.Fatal(router.Run(":8080"))
}
