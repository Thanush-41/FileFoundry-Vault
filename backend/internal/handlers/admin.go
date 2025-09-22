package handlers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"file-vault-system/backend/internal/config"
	"file-vault-system/backend/internal/models"
	"file-vault-system/backend/internal/services"
)

type AdminHandler struct {
	db           *gorm.DB
	cfg          *config.Config
	auditService *services.AuditService
}

func NewAdminHandler(db *gorm.DB, cfg *config.Config, auditService *services.AuditService) *AdminHandler {
	return &AdminHandler{
		db:           db,
		cfg:          cfg,
		auditService: auditService,
	}
}

type SystemStats struct {
	TotalUsers           int64   `json:"totalUsers"`
	TotalFiles           int64   `json:"totalFiles"`
	TotalStorage         int64   `json:"totalStorage"`
	ActiveUsers          int64   `json:"activeUsers"`
	FilesUploadedToday   int64   `json:"filesUploadedToday"`
	TotalFolders         int64   `json:"totalFolders"`
	TotalSharedLinks     int64   `json:"totalSharedLinks"`
	TotalUploadedBytes   int64   `json:"totalUploadedBytes"`
	ActualStorageBytes   int64   `json:"actualStorageBytes"`
	GlobalSavedBytes     int64   `json:"globalSavedBytes"`
	GlobalSavingsPercent float64 `json:"globalSavingsPercent"`
}

// GetStats returns system statistics
func (h *AdminHandler) GetStats(c *gin.Context) {
	var stats SystemStats

	// Get total users - handle potential errors
	if err := h.db.Model(&models.User{}).Count(&stats.TotalUsers).Error; err != nil {
		stats.TotalUsers = 0
	}

	// Get total files - handle potential errors
	if err := h.db.Model(&models.File{}).Where("is_deleted = false").Count(&stats.TotalFiles).Error; err != nil {
		stats.TotalFiles = 0
	}

	// Get total storage used - handle potential errors
	var totalStorage int64
	if err := h.db.Model(&models.User{}).Select("COALESCE(SUM(storage_used), 0)").Scan(&totalStorage).Error; err == nil {
		stats.TotalStorage = totalStorage
	} else {
		stats.TotalStorage = 0
	}

	// Get active users (users who logged in within last 30 days) - handle potential errors
	if err := h.db.Model(&models.User{}).Where("last_login > ?", time.Now().AddDate(0, 0, -30)).Count(&stats.ActiveUsers).Error; err != nil {
		stats.ActiveUsers = 0
	}

	// Get files uploaded today - handle potential errors
	today := time.Now().Truncate(24 * time.Hour)
	if err := h.db.Model(&models.File{}).Where("created_at >= ? AND is_deleted = false", today).Count(&stats.FilesUploadedToday).Error; err != nil {
		stats.FilesUploadedToday = 0
	}

	// Get total folders - handle potential errors
	if err := h.db.Model(&models.Folder{}).Count(&stats.TotalFolders).Error; err != nil {
		stats.TotalFolders = 0
	}

	// Get total shared links - handle potential errors
	if err := h.db.Model(&models.ShareLink{}).Count(&stats.TotalSharedLinks).Error; err != nil {
		stats.TotalSharedLinks = 0
	}

	// Get global deduplication statistics
	var totalUploadedBytes, actualStorageBytes, savedBytes int64

	// Sum all users' uploaded bytes
	if err := h.db.Model(&models.User{}).Select("COALESCE(SUM(total_uploaded_bytes), 0)").Scan(&totalUploadedBytes).Error; err == nil {
		stats.TotalUploadedBytes = totalUploadedBytes
	}

	// Sum all users' actual storage bytes
	if err := h.db.Model(&models.User{}).Select("COALESCE(SUM(actual_storage_bytes), 0)").Scan(&actualStorageBytes).Error; err == nil {
		stats.ActualStorageBytes = actualStorageBytes
	}

	// Sum all users' saved bytes
	if err := h.db.Model(&models.User{}).Select("COALESCE(SUM(saved_bytes), 0)").Scan(&savedBytes).Error; err == nil {
		stats.GlobalSavedBytes = savedBytes
	}

	// Calculate global savings percentage
	if stats.TotalUploadedBytes > 0 {
		stats.GlobalSavingsPercent = (float64(stats.GlobalSavedBytes) / float64(stats.TotalUploadedBytes)) * 100
	}

	c.JSON(http.StatusOK, stats)
}

// GetUsers returns a list of users (admin only)
func (h *AdminHandler) GetUsers(c *gin.Context) {
	var users []models.User

	if err := h.db.Select("id, username, email, first_name, last_name, role, storage_quota, storage_used, total_uploaded_bytes, actual_storage_bytes, saved_bytes, is_active, email_verified, last_login, created_at").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"users": users,
	})
}

// GetAllFiles returns a list of all files in the system (admin only)
func (h *AdminHandler) GetAllFiles(c *gin.Context) {
	var files []models.File

	if err := h.db.Preload("Owner", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, username, email, first_name, last_name")
	}).Where("is_deleted = false").Find(&files).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get files"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"files": files,
	})
}

// UpdateUserRole updates a user's role (admin only)
func (h *AdminHandler) UpdateUserRole(c *gin.Context) {
	userID := c.Param("id")

	var request struct {
		Role string `json:"role" binding:"required,oneof=user admin"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse user ID
	uid, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Check if user exists and get current info
	var user models.User
	if err := h.db.First(&user, uid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Don't allow changing the system admin user's role
	if user.Username == "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot modify the system admin user's role"})
		return
	}

	// Update user role
	if err := h.db.Model(&models.User{}).Where("id = ?", uid).Update("role", request.Role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user role"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User role updated successfully",
	})
}

// DeleteUser deletes a user account (admin only)
func (h *AdminHandler) DeleteUser(c *gin.Context) {
	userID := c.Param("id")

	// Parse user ID
	uid, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Check if user exists
	var user models.User
	if err := h.db.First(&user, uid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Don't allow deletion of admin user
	if user.Username == "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete the system admin user"})
		return
	}

	// Don't allow deletion of admin users
	if user.Role == models.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete admin users"})
		return
	}

	// Soft delete user
	if err := h.db.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User deleted successfully",
	})
}

// GetUserDetails returns detailed information about a user including their files and stats (admin only)
func (h *AdminHandler) GetUserDetails(c *gin.Context) {
	userID := c.Param("id")

	// Parse user ID
	uid, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Get user with detailed storage information
	var user models.User
	if err := h.db.Select("id, username, email, first_name, last_name, role, storage_quota, storage_used, total_uploaded_bytes, actual_storage_bytes, saved_bytes, is_active, email_verified, last_login, created_at").First(&user, uid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Get user's files with file hash information for deduplication stats
	var files []models.File
	if err := h.db.Preload("FileHash").Where("owner_id = ? AND is_deleted = false", uid).Find(&files).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user files"})
		return
	}

	// Calculate file statistics
	var totalFiles int64 = int64(len(files))
	var uniqueFiles int64 = 0
	var duplicateFiles int64 = 0
	seenHashes := make(map[string]bool)

	for _, file := range files {
		if file.FileHash != nil {
			if !seenHashes[file.FileHash.Hash] {
				seenHashes[file.FileHash.Hash] = true
				uniqueFiles++
			} else {
				duplicateFiles++
			}
		}
	}

	// Calculate savings percentage
	var savingsPercent float64 = 0
	if user.TotalUploadedBytes > 0 {
		savingsPercent = float64(user.SavedBytes) / float64(user.TotalUploadedBytes) * 100
	}

	response := gin.H{
		"user":  user,
		"files": files,
		"statistics": gin.H{
			"totalFiles":         totalFiles,
			"uniqueFiles":        uniqueFiles,
			"duplicateFiles":     duplicateFiles,
			"totalUploadedBytes": user.TotalUploadedBytes,
			"actualStorageBytes": user.ActualStorageBytes,
			"savedBytes":         user.SavedBytes,
			"savingsPercent":     savingsPercent,
			"deduplicationRatio": float64(duplicateFiles) / float64(totalFiles) * 100,
		},
	}

	c.JSON(http.StatusOK, response)
}

// GetSystemHealth returns system health information (admin only)
func (h *AdminHandler) GetSystemHealth(c *gin.Context) {
	health := gin.H{
		"status":    "healthy",
		"timestamp": time.Now(),
		"database":  "connected",
		"uptime":    time.Since(startTime).String(),
	}

	// Check database connection
	if sqlDB, err := h.db.DB(); err != nil {
		health["database"] = "disconnected"
		health["status"] = "degraded"
	} else if err := sqlDB.Ping(); err != nil {
		health["database"] = "error"
		health["status"] = "degraded"
	}

	c.JSON(http.StatusOK, health)
}

var startTime = time.Now()

// GetAllFilesWithStats returns all files with owner details and download statistics (admin only)
func (h *AdminHandler) GetAllFilesWithStats(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	search := c.Query("search")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	offset := (page - 1) * limit

	// Base query
	query := h.db.Preload("Owner", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, username, email, first_name, last_name")
	}).Preload("Folder", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, name, path")
	}).Where("is_deleted = false")

	// Add search functionality
	if search != "" {
		query = query.Where("original_filename ILIKE ? OR description ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	// Get total count
	var total int64
	if err := query.Model(&models.File{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count files"})
		return
	}

	// Get files with pagination
	var files []models.File
	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&files).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get files"})
		return
	}

	// Enhance files with download statistics
	type FileWithStats struct {
		models.File
		DownloadCount     int64      `json:"download_count"`
		LastDownload      *time.Time `json:"last_download"`
		UniqueDownloaders int64      `json:"unique_downloaders"`
	}

	filesWithStats := make([]FileWithStats, len(files))
	for i, file := range files {
		// Get download count
		var downloadCount int64
		h.db.Model(&models.DownloadStat{}).Where("file_id = ?", file.ID).Count(&downloadCount)

		// Get last download
		var lastDownload time.Time
		err := h.db.Model(&models.DownloadStat{}).
			Where("file_id = ?", file.ID).
			Order("downloaded_at DESC").
			Limit(1).
			Select("downloaded_at").
			Scan(&lastDownload).Error

		// Get unique downloaders count
		var uniqueDownloaders int64
		h.db.Model(&models.DownloadStat{}).
			Where("file_id = ? AND downloaded_by IS NOT NULL", file.ID).
			Distinct("downloaded_by").
			Count(&uniqueDownloaders)

		filesWithStats[i] = FileWithStats{
			File:              file,
			DownloadCount:     downloadCount,
			UniqueDownloaders: uniqueDownloaders,
		}

		if err == nil && !lastDownload.IsZero() {
			filesWithStats[i].LastDownload = &lastDownload
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"files": filesWithStats,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetFileStats returns detailed statistics for a specific file (admin only)
func (h *AdminHandler) GetFileStats(c *gin.Context) {
	fileID := c.Param("id")

	// Parse file ID
	fid, err := uuid.Parse(fileID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	// Get file with owner info
	var file models.File
	if err := h.db.Preload("Owner", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, username, email, first_name, last_name")
	}).Where("id = ? AND is_deleted = false", fid).First(&file).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get file"})
		return
	}

	// Get download statistics
	var downloadStats []models.DownloadStat
	if err := h.db.Preload("User", func(db *gorm.DB) *gorm.DB {
		return db.Select("id, username, email, first_name, last_name")
	}).Where("file_id = ?", fid).Order("downloaded_at DESC").Find(&downloadStats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get download stats"})
		return
	}

	// Calculate summary statistics
	totalDownloads := len(downloadStats)
	uniqueDownloaders := make(map[string]bool)
	var totalBytes int64
	var lastDownload *time.Time

	if totalDownloads > 0 {
		lastDownload = &downloadStats[0].DownloadedAt
	}

	for _, stat := range downloadStats {
		if stat.DownloadedBy != nil {
			uniqueDownloaders[stat.DownloadedBy.String()] = true
		}
		totalBytes += stat.DownloadSize
	}

	// Get sharing information
	var shareCount int64
	h.db.Model(&models.FileShare{}).Where("file_id = ?", fid).Count(&shareCount)

	var linkCount int64
	h.db.Model(&models.ShareLink{}).Where("file_id = ?", fid).Count(&linkCount)

	c.JSON(http.StatusOK, gin.H{
		"file": file,
		"stats": gin.H{
			"total_downloads":        totalDownloads,
			"unique_downloaders":     len(uniqueDownloaders),
			"total_bytes_downloaded": totalBytes,
			"last_download":          lastDownload,
			"share_count":            shareCount,
			"link_count":             linkCount,
		},
		"recent_downloads": downloadStats[:min(10, len(downloadStats))], // Last 10 downloads
	})
}

// ShareFileAsAdmin allows admin to share files with users (admin only)
func (h *AdminHandler) ShareFileAsAdmin(c *gin.Context) {
	fileID := c.Param("id")

	var request struct {
		SharedWith []uuid.UUID            `json:"shared_with" binding:"required"`
		Permission models.SharePermission `json:"permission" binding:"required,oneof=view download"`
		Message    string                 `json:"message"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse file ID
	fid, err := uuid.Parse(fileID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	// Get admin user ID
	adminUserID, _ := c.Get("user_id")

	// Check if file exists
	var file models.File
	if err := h.db.Where("id = ? AND is_deleted = false", fid).First(&file).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get file"})
		return
	}

	// Create shares for each user
	var successCount int
	var errors []string

	for _, userID := range request.SharedWith {
		// Check if user exists
		var user models.User
		if err := h.db.Where("id = ?", userID).First(&user).Error; err != nil {
			errors = append(errors, fmt.Sprintf("User %s not found", userID))
			continue
		}

		// Check if already shared
		var existingShare models.FileShare
		if err := h.db.Where("file_id = ? AND shared_with = ?", fid, userID).First(&existingShare).Error; err == nil {
			errors = append(errors, fmt.Sprintf("File already shared with %s", user.Username))
			continue
		}

		// Create new share
		share := models.FileShare{
			FileID:     fid,
			SharedBy:   adminUserID.(uuid.UUID),
			SharedWith: userID,
			Permission: request.Permission,
			Message:    request.Message,
			IsActive:   true,
		}

		if err := h.db.Create(&share).Error; err != nil {
			errors = append(errors, fmt.Sprintf("Failed to share with %s: %v", user.Username, err))
			continue
		}

		successCount++
	}

	response := gin.H{
		"message":       fmt.Sprintf("Successfully shared with %d users", successCount),
		"success_count": successCount,
	}

	if len(errors) > 0 {
		response["errors"] = errors
	}

	c.JSON(http.StatusOK, response)
}

// Helper function for min
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// UploadFileAsAdmin allows admin to upload files (admin only)
func (h *AdminHandler) UploadFileAsAdmin(c *gin.Context) {
	// Store sharing parameters for later use
	makePublic := c.PostForm("makePublic")
	shareWithUsers := c.PostForm("shareWithUsers")

	// Convert makePublic to is_public parameter that the regular upload expects
	if makePublic == "true" {
		// Set the is_public form value that the regular UploadFile expects
		if c.Request.PostForm == nil {
			c.Request.PostForm = make(map[string][]string)
		}
		c.Request.PostForm.Set("is_public", "true")
	}

	// Get admin user ID
	adminUserID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Create a file handler instance and delegate to the regular upload
	fileHandler := NewFileHandler(h.db, h.cfg, h.auditService)

	// Set context to indicate this is an admin upload
	c.Set("admin_upload", true)

	// Call the regular upload handler
	fileHandler.UploadFile(c)

	// For now, we'll skip the automatic sharing and require manual sharing via the UI
	// This is simpler and more reliable
	_ = shareWithUsers
	_ = adminUserID
}

// GetUserFiles gets all files belonging to a specific user (admin only)
func (h *AdminHandler) GetUserFiles(c *gin.Context) {
	userID := c.Param("id")

	// Parse user ID
	uid, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Check if user exists
	var user models.User
	if err := h.db.First(&user, uid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Get pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset := (page - 1) * limit

	// Query files for this user with stats
	var files []struct {
		models.File
		DownloadCount     int64       `json:"downloadCount"`
		UniqueDownloaders int64       `json:"uniqueDownloaders"`
		LastDownload      *time.Time  `json:"lastDownload"`
		Owner             models.User `json:"owner"`
	}

	query := h.db.Table("files").
		Select("files.*, "+
			"COALESCE(download_stats.download_count, 0) as download_count, "+
			"COALESCE(download_stats.unique_downloaders, 0) as unique_downloaders, "+
			"download_stats.last_download").
		Joins("LEFT JOIN ("+
			"SELECT file_id, "+
			"COUNT(*) as download_count, "+
			"COUNT(DISTINCT downloaded_by) as unique_downloaders, "+
			"MAX(downloaded_at) as last_download "+
			"FROM download_stats "+
			"GROUP BY file_id"+
			") download_stats ON files.id = download_stats.file_id").
		Where("files.owner_id = ? AND files.is_deleted = false", uid).
		Offset(offset).
		Limit(limit)

	if err := query.Find(&files).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user files"})
		return
	}

	// Load owner information for each file
	for i := range files {
		if err := h.db.First(&files[i].Owner, files[i].File.OwnerID).Error; err != nil {
			// Set empty owner if not found
			files[i].Owner = models.User{Username: "Unknown"}
		}
	}

	// Get total count for this user
	var total int64
	h.db.Model(&models.File{}).Where("owner_id = ? AND is_deleted = false", uid).Count(&total)

	c.JSON(http.StatusOK, gin.H{
		"files": files,
		"pagination": gin.H{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalPages": (total + int64(limit) - 1) / int64(limit),
		},
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
		},
	})
}

// MakeFilePublic makes a file publicly accessible (admin only)
func (h *AdminHandler) MakeFilePublic(c *gin.Context) {
	fileID := c.Param("id")

	// Parse file ID
	fid, err := uuid.Parse(fileID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	// Check if file exists
	var file models.File
	if err := h.db.First(&file, fid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Update file to be public
	if err := h.db.Model(&file).Update("is_public", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update file visibility"})
		return
	}

	// Get current user ID
	userIDStr := c.GetString("userID")
	createdBy, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user session"})
		return
	}

	// Create a public share link (optional, for backwards compatibility)
	shareLink := models.ShareLink{
		FileID:     file.ID,
		ShareToken: uuid.New().String(),
		Permission: models.PermissionView,
		ExpiresAt:  nil, // No expiration for public files
		CreatedBy:  createdBy,
		IsActive:   true,
	}

	if err := h.db.Create(&shareLink).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create share link"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "File made public successfully",
		"file_id":   file.ID,
		"is_public": true,
		"shareLink": shareLink.ShareToken,
		"publicUrl": fmt.Sprintf("/share/%s", shareLink.ShareToken),
	})
}

// MakeFilePrivate makes a file private (admin only)
func (h *AdminHandler) MakeFilePrivate(c *gin.Context) {
	fileID := c.Param("id")

	// Parse file ID
	fid, err := uuid.Parse(fileID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	// Check if file exists
	var file models.File
	if err := h.db.First(&file, fid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	// Update file to be private
	if err := h.db.Model(&file).Update("is_public", false).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update file visibility"})
		return
	}

	// Optionally deactivate existing share links for this file
	if err := h.db.Model(&models.ShareLink{}).Where("file_id = ?", file.ID).Update("is_active", false).Error; err != nil {
		// Log error but don't fail the request
		fmt.Printf("Warning: Failed to deactivate share links for file %s: %v\n", file.ID, err)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "File made private successfully",
		"file_id":   file.ID,
		"is_public": false,
	})
}

// ViewFileAsAdmin serves file content for admin preview/viewing (bypasses ownership checks)
func (h *AdminHandler) ViewFileAsAdmin(c *gin.Context) {
	fmt.Printf("DEBUG ViewFileAsAdmin: Function called\n")
	fileID := c.Param("id")
	fmt.Printf("DEBUG ViewFileAsAdmin: File ID: %s\n", fileID)

	// Get file record without ownership checks (admin can view any file)
	var file models.File
	if err := h.db.Where("id = ? AND is_deleted = false", fileID).First(&file).Error; err != nil {
		fmt.Printf("DEBUG ViewFileAsAdmin: Database error: %v\n", err)
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	fmt.Printf("DEBUG ViewFileAsAdmin: Found file: %s, FileHashID: %s\n", file.ID, file.FileHashID)

	// Get file hash to locate physical file
	var fileHash models.FileHash
	if err := h.db.Where("id = ?", file.FileHashID).First(&fileHash).Error; err != nil {
		fmt.Printf("DEBUG ViewFileAsAdmin: File hash error: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "File hash not found"})
		return
	}

	fmt.Printf("DEBUG ViewFileAsAdmin: Found file hash: %s, StoragePath: %s\n", fileHash.ID, fileHash.StoragePath)

	// Build full file path like in regular ViewFile
	filePath := filepath.Join(h.cfg.StoragePath, fileHash.StoragePath)
	fmt.Printf("DEBUG ViewFileAsAdmin: Full file path: %s\n", filePath)

	// Set appropriate headers for file viewing
	c.Header("Content-Type", file.MimeType)
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", file.OriginalFilename))
	c.Header("Cache-Control", "private, max-age=3600")

	// Serve the file
	c.File(filePath)
}

// DownloadFileAsAdmin serves file content for admin download (bypasses ownership checks)
func (h *AdminHandler) DownloadFileAsAdmin(c *gin.Context) {
	fileID := c.Param("id")

	// Get file record without ownership checks (admin can download any file)
	var file models.File
	if err := h.db.Where("id = ? AND is_deleted = false", fileID).First(&file).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Get file hash to locate physical file
	var fileHash models.FileHash
	if err := h.db.Where("id = ?", file.FileHashID).First(&fileHash).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "File hash not found"})
		return
	}

	// Build full file path
	filePath := filepath.Join(h.cfg.StoragePath, fileHash.StoragePath)

	// Set appropriate headers for file download
	c.Header("Content-Type", "application/octet-stream")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", file.OriginalFilename))
	c.Header("Cache-Control", "private, max-age=3600")

	// Serve the file for download
	c.File(filePath)
}

// UserDeduplicationSummary represents deduplication statistics for a single user
type UserDeduplicationSummary struct {
	UserID             uuid.UUID  `json:"userId"`
	Username           string     `json:"username"`
	Email              string     `json:"email"`
	FirstName          string     `json:"firstName"`
	LastName           string     `json:"lastName"`
	TotalFiles         int64      `json:"totalFiles"`
	TotalUploadedBytes int64      `json:"totalUploadedBytes"`
	ActualStorageBytes int64      `json:"actualStorageBytes"`
	SavedBytes         int64      `json:"savedBytes"`
	DeduplicationRatio float64    `json:"deduplicationRatio"` // Percentage of storage saved
	StorageEfficiency  float64    `json:"storageEfficiency"`  // Actual storage / Total uploaded
	UniqueFilesRatio   float64    `json:"uniqueFilesRatio"`   // Unique files / Total files
	LastFileUpload     *time.Time `json:"lastFileUpload"`
	IsActive           bool       `json:"isActive"`
}

// GetUserDeduplicationSummary returns deduplication statistics for all users
func (h *AdminHandler) GetUserDeduplicationSummary(c *gin.Context) {
	var users []models.User
	var summaries []UserDeduplicationSummary

	// Get all users with their basic info
	if err := h.db.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	// Calculate deduplication stats for each user
	for _, user := range users {
		summary := UserDeduplicationSummary{
			UserID:    user.ID,
			Username:  user.Username,
			Email:     user.Email,
			FirstName: user.FirstName,
			LastName:  user.LastName,
			IsActive:  user.IsActive,
		}

		// Get total files count for this user
		var fileCount int64
		h.db.Model(&models.File{}).Where("owner_id = ? AND is_deleted = false", user.ID).Count(&fileCount)
		summary.TotalFiles = fileCount

		// Get the latest file upload timestamp
		var latestFile models.File
		if err := h.db.Where("owner_id = ? AND is_deleted = false", user.ID).
			Order("created_at DESC").First(&latestFile).Error; err == nil {
			summary.LastFileUpload = &latestFile.CreatedAt
		}

		// Use the deduplication tracking fields from the user model
		summary.TotalUploadedBytes = user.TotalUploadedBytes
		summary.ActualStorageBytes = user.ActualStorageBytes
		summary.SavedBytes = user.SavedBytes

		// Calculate deduplication ratio (percentage of storage saved)
		if summary.TotalUploadedBytes > 0 {
			summary.DeduplicationRatio = float64(summary.SavedBytes) / float64(summary.TotalUploadedBytes) * 100
			summary.StorageEfficiency = float64(summary.ActualStorageBytes) / float64(summary.TotalUploadedBytes) * 100
		} else {
			summary.DeduplicationRatio = 0.0
			summary.StorageEfficiency = 0.0
		}

		// Calculate unique files ratio (count of unique file hashes user has uploaded)
		var uniqueHashCount int64
		h.db.Table("files").
			Select("COUNT(DISTINCT file_hash_id)").
			Where("owner_id = ? AND is_deleted = false", user.ID).
			Count(&uniqueHashCount)

		if summary.TotalFiles > 0 {
			summary.UniqueFilesRatio = float64(uniqueHashCount) / float64(summary.TotalFiles) * 100
		} else {
			summary.UniqueFilesRatio = 0.0
		}

		summaries = append(summaries, summary)
	}

	c.JSON(http.StatusOK, gin.H{
		"userDeduplicationSummaries": summaries,
		"totalUsers":                 len(summaries),
	})
}

// GetUserDeduplicationDetails returns detailed deduplication info for a specific user
func (h *AdminHandler) GetUserDeduplicationDetails(c *gin.Context) {
	userID := c.Param("userId")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User ID is required"})
		return
	}

	// Parse user ID
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Get user details
	var user models.User
	if err := h.db.First(&user, parsedUserID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Get detailed file information with deduplication stats
	type FileDeduplicationInfo struct {
		FileID           uuid.UUID `json:"fileId"`
		Filename         string    `json:"filename"`
		OriginalFilename string    `json:"originalFilename"`
		Size             int64     `json:"size"`
		FileHashID       uuid.UUID `json:"fileHashId"`
		Hash             string    `json:"hash"`
		ReferenceCount   int       `json:"referenceCount"`
		IsDuplicate      bool      `json:"isDuplicate"`
		CreatedAt        time.Time `json:"createdAt"`
	}

	var fileDetails []FileDeduplicationInfo
	query := `
		SELECT 
			f.id as file_id,
			f.filename,
			f.original_filename,
			f.size,
			f.file_hash_id,
			fh.hash,
			fh.reference_count,
			CASE WHEN fh.reference_count > 1 THEN true ELSE false END as is_duplicate,
			f.created_at
		FROM files f
		JOIN file_hashes fh ON f.file_hash_id = fh.id
		WHERE f.owner_id = ? AND f.is_deleted = false
		ORDER BY f.created_at DESC
	`

	if err := h.db.Raw(query, parsedUserID).Scan(&fileDetails).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch file details"})
		return
	}

	// Calculate summary stats
	summary := UserDeduplicationSummary{
		UserID:             user.ID,
		Username:           user.Username,
		Email:              user.Email,
		FirstName:          user.FirstName,
		LastName:           user.LastName,
		TotalFiles:         int64(len(fileDetails)),
		TotalUploadedBytes: user.TotalUploadedBytes,
		ActualStorageBytes: user.ActualStorageBytes,
		SavedBytes:         user.SavedBytes,
		IsActive:           user.IsActive,
	}

	if summary.TotalUploadedBytes > 0 {
		summary.DeduplicationRatio = float64(summary.SavedBytes) / float64(summary.TotalUploadedBytes) * 100
		summary.StorageEfficiency = float64(summary.ActualStorageBytes) / float64(summary.TotalUploadedBytes) * 100
	}

	// Count unique files
	uniqueHashes := make(map[uuid.UUID]bool)
	for _, file := range fileDetails {
		uniqueHashes[file.FileHashID] = true
	}

	if summary.TotalFiles > 0 {
		summary.UniqueFilesRatio = float64(len(uniqueHashes)) / float64(summary.TotalFiles) * 100
	}

	if len(fileDetails) > 0 {
		summary.LastFileUpload = &fileDetails[0].CreatedAt
	}

	c.JSON(http.StatusOK, gin.H{
		"user":        summary,
		"fileDetails": fileDetails,
		"statistics": gin.H{
			"totalFiles":     len(fileDetails),
			"uniqueFiles":    len(uniqueHashes),
			"duplicateFiles": len(fileDetails) - len(uniqueHashes),
			"duplicateFilesList": func() []FileDeduplicationInfo {
				var duplicates []FileDeduplicationInfo
				for _, file := range fileDetails {
					if file.IsDuplicate {
						duplicates = append(duplicates, file)
					}
				}
				return duplicates
			}(),
		},
	})
}
