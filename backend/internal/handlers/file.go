package handlers

import (
	"crypto/sha256"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"file-vault-system/backend/internal/config"
	"file-vault-system/backend/internal/models"
	"file-vault-system/backend/internal/services"
	"file-vault-system/backend/pkg/utils"
)

// FileUploadInfo holds information about a file being uploaded
type FileUploadInfo struct {
	Header   *multipart.FileHeader
	Content  []byte
	Size     int64
	Hash     string
	MimeType string
	IsValid  bool
	Warning  string
}

type FileHandler struct {
	db           *gorm.DB
	cfg          *config.Config
	auditService *services.AuditService
}

func NewFileHandler(db *gorm.DB, cfg *config.Config, auditService *services.AuditService) *FileHandler {
	return &FileHandler{
		db:           db,
		cfg:          cfg,
		auditService: auditService,
	}
}

// recordDownload records a download statistic for a file
func (h *FileHandler) recordDownload(fileID uuid.UUID, userID *uuid.UUID, shareID *uuid.UUID, c *gin.Context) {
	downloadStat := models.DownloadStat{
		FileID:       fileID,
		DownloadedBy: userID,
		SharedLinkID: shareID,
		IPAddress:    c.ClientIP(),
		UserAgent:    c.GetHeader("User-Agent"),
		DownloadSize: 0, // Will be set if needed
	}

	// Log the download (ignore errors as this is supplementary data)
	h.db.Create(&downloadStat)
}

// GetUserStats returns storage statistics for the authenticated user
func (h *FileHandler) GetUserStats(c *gin.Context) {
	// Get user from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get user with storage stats
	var user models.User
	if err := h.db.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user"})
		return
	}

	// Count user's files
	var fileCount int64
	h.db.Model(&models.File{}).Where("owner_id = ? AND is_deleted = false", userID).Count(&fileCount)

	// Count folders created by this user
	var foldersCreated int64
	h.db.Model(&models.Folder{}).Where("owner_id = ?", userID).Count(&foldersCreated)

	// Count files shared by this user (files shared with others)
	var filesShared int64
	h.db.Table("file_shares").
		Joins("JOIN files ON file_shares.file_id = files.id").
		Where("file_shares.shared_by = ? AND files.is_deleted = false", userID).
		Count(&filesShared)

	// Calculate storage efficiency
	storageEfficiency := float64(0)
	if user.TotalUploadedBytes > 0 {
		storageEfficiency = (float64(user.SavedBytes) / float64(user.TotalUploadedBytes)) * 100
	}

	// Calculate remaining storage
	remainingStorage := user.StorageQuota - user.StorageUsed
	if remainingStorage < 0 {
		remainingStorage = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"total_uploaded_bytes": user.TotalUploadedBytes,
		"actual_storage_bytes": user.ActualStorageBytes,
		"saved_bytes":          user.SavedBytes,
		"storage_used":         user.StorageUsed,
		"storage_quota":        user.StorageQuota,
		"remaining_storage":    remainingStorage,
		"file_count":           fileCount,
		"foldersCreated":       foldersCreated,
		"filesShared":          filesShared,
		"storage_efficiency":   storageEfficiency,
	})
}

// GetFileDownloadStats returns download statistics for files owned by the authenticated user
func (h *FileHandler) GetFileDownloadStats(c *gin.Context) {
	// Get user from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get download statistics for user's files
	var stats []struct {
		FileID           uuid.UUID  `json:"file_id"`
		OriginalFilename string     `json:"original_filename"`
		IsPublic         bool       `json:"is_public"`
		TotalDownloads   int64      `json:"total_downloads"`
		PublicDownloads  int64      `json:"public_downloads"` // Downloads by non-owners
		LastDownload     *time.Time `json:"last_download"`
	}

	query := `
		SELECT 
			f.id as file_id,
			f.original_filename,
			f.is_public,
			COUNT(ds.id) as total_downloads,
			COUNT(CASE WHEN ds.downloaded_by IS NULL OR ds.downloaded_by != f.owner_id THEN 1 END) as public_downloads,
			MAX(ds.downloaded_at) as last_download
		FROM files f
		LEFT JOIN download_stats ds ON f.id = ds.file_id
		WHERE f.owner_id = ? AND f.is_deleted = false
		GROUP BY f.id, f.original_filename, f.is_public
		ORDER BY total_downloads DESC, f.original_filename ASC
	`

	if err := h.db.Raw(query, userID).Scan(&stats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get download statistics"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"file_download_stats": stats,
	})
}

// UploadFile handles single and multiple file uploads with deduplication and MIME validation
func (h *FileHandler) UploadFile(c *gin.Context) {
	// Get user from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get folder ID from form data or query parameter
	var folderID *uuid.UUID
	folderIDStr := c.PostForm("folder_id")
	if folderIDStr == "" {
		folderIDStr = c.Query("folder_id")
	}

	if folderIDStr != "" && folderIDStr != "null" && folderIDStr != "root" {
		parsedFolderID, err := uuid.Parse(folderIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid folder ID format"})
			return
		}

		// Verify folder exists and user owns it
		var folder models.Folder
		if err := h.db.Where("id = ? AND owner_id = ?", parsedFolderID, userID).First(&folder).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"error": "Target folder not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify folder"})
			return
		}
		folderID = &parsedFolderID
	}

	// Initialize MIME type validator
	validator := utils.NewMimeTypeValidator()

	// Parse multipart form with max memory (32MB)
	err := c.Request.ParseMultipartForm(32 << 20)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse multipart form"})
		return
	}

	// Check if files were uploaded
	form := c.Request.MultipartForm
	if form == nil || form.File == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No files uploaded"})
		return
	}

	// Get files from both 'file' (single) and 'files' (multiple) fields
	var allFiles []*multipart.FileHeader

	// Single file upload (field name: "file")
	if files, exists := form.File["file"]; exists {
		allFiles = append(allFiles, files...)
	}

	// Multiple file upload (field name: "files")
	if files, exists := form.File["files"]; exists {
		allFiles = append(allFiles, files...)
	}

	if len(allFiles) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No files found in upload"})
		return
	}

	// Check user storage quota and limits
	var user models.User
	if err := h.db.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user"})
		return
	}

	// Get is_public parameter from form data
	isPublic := false
	if isPublicStr := c.PostForm("is_public"); isPublicStr == "true" {
		isPublic = true
	}

	// Validate each file and calculate total size
	var uploadFiles []FileUploadInfo
	var totalSize int64

	for _, fileHeader := range allFiles {
		// Open file
		file, err := fileHeader.Open()
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": fmt.Sprintf("Failed to open file %s", fileHeader.Filename),
			})
			return
		}

		// Read file content
		content, err := io.ReadAll(file)
		file.Close()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": fmt.Sprintf("Failed to read file %s", fileHeader.Filename),
			})
			return
		}

		fileSize := int64(len(content))

		// Validate file size
		if fileSize > h.cfg.MaxFileSize {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":     fmt.Sprintf("File %s exceeds size limit", fileHeader.Filename),
				"max_size":  h.cfg.MaxFileSize,
				"file_size": fileSize,
			})
			return
		}

		// Validate MIME type
		declaredMimeType := fileHeader.Header.Get("Content-Type")
		if declaredMimeType == "" {
			declaredMimeType = "application/octet-stream"
		}

		isValid, actualMimeType, warning := validator.ValidateMimeType(content, declaredMimeType, fileHeader.Filename)

		if !isValid {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":             fmt.Sprintf("Invalid file type for %s", fileHeader.Filename),
				"filename":          fileHeader.Filename,
				"declared_mimetype": declaredMimeType,
				"actual_mimetype":   actualMimeType,
				"warning":           warning,
			})
			return
		}

		// Check if MIME type is allowed (if configured)
		if len(h.cfg.AllowedMimeTypes) > 0 && !validator.IsAllowedMimeType(actualMimeType, h.cfg.AllowedMimeTypes) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":         fmt.Sprintf("File type not allowed for %s", fileHeader.Filename),
				"filename":      fileHeader.Filename,
				"mimetype":      actualMimeType,
				"allowed_types": h.cfg.AllowedMimeTypes,
			})
			return
		}

		uploadFiles = append(uploadFiles, FileUploadInfo{
			Header:   fileHeader,
			Content:  content,
			Size:     fileSize,
			Hash:     h.calculateContentHash(content),
			MimeType: actualMimeType,
			IsValid:  isValid,
			Warning:  warning,
		})

		totalSize += fileSize
	}

	// Check total storage quota
	if user.StorageUsed+totalSize > user.StorageQuota {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":         "Total upload size exceeds storage quota",
			"total_size":    totalSize,
			"storage_used":  user.StorageUsed,
			"storage_quota": user.StorageQuota,
			"available":     user.StorageQuota - user.StorageUsed,
		})
		return
	}

	// Process each file upload
	var results []map[string]interface{}
	var totalSavedBytes int64
	var totalActualStorage int64
	var totalUploadedBytes int64

	// Start transaction for atomic operation
	tx := h.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	for _, uploadFile := range uploadFiles {
		result, savedBytes, actualStorageUsed, err := h.processFileUpload(tx, uploadFile, userID.(uuid.UUID), folderID, isPublic)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":    "Failed to process file upload",
				"filename": uploadFile.Header.Filename,
				"details":  err.Error(),
			})
			return
		}

		results = append(results, result)
		totalSavedBytes += savedBytes
		totalActualStorage += actualStorageUsed
		totalUploadedBytes += uploadFile.Size
	}

	// Update user storage statistics
	if err := h.updateUserStorageStats(tx, userID.(uuid.UUID), totalUploadedBytes, totalActualStorage, totalSavedBytes); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user storage stats"})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit upload transaction"})
		return
	}

	// Log audit activities for successful uploads
	if h.auditService != nil {
		for _, result := range results {
			if fileID, ok := result["id"].(uuid.UUID); ok {
				if filename, ok := result["original_filename"].(string); ok {
					if fileSize, ok := result["size"].(int64); ok {
						// Log the upload activity (non-blocking)
						go func(fid uuid.UUID, fname string, fsize int64) {
							if err := h.auditService.LogFileUpload(c, userID.(uuid.UUID), fid, fname, fsize); err != nil {
								// Log error but don't fail the upload
								fmt.Printf("Failed to log upload audit: %v\n", err)
							}
						}(fileID, filename, fileSize)
					}
				}
			}
		}
	}

	// Return results
	response := gin.H{
		"message":              "Files uploaded successfully",
		"uploaded_files_count": len(results),
		"total_size":           totalUploadedBytes,
		"total_saved_bytes":    totalSavedBytes,
		"files":                results,
	}

	// Add warnings if any
	warnings := []string{}
	for _, uploadFile := range uploadFiles {
		if uploadFile.Warning != "" {
			warnings = append(warnings, fmt.Sprintf("%s: %s", uploadFile.Header.Filename, uploadFile.Warning))
		}
	}
	if len(warnings) > 0 {
		response["warnings"] = warnings
	}

	c.JSON(http.StatusOK, response)
}

// processFileUpload handles the upload of a single file within a transaction
func (h *FileHandler) processFileUpload(tx *gorm.DB, uploadFile FileUploadInfo, userID uuid.UUID, folderID *uuid.UUID, isPublic bool) (map[string]interface{}, int64, int64, error) {
	// Check if file hash already exists (deduplication)
	var existingHash models.FileHash
	isNewContent := false
	err := tx.Where("hash = ?", uploadFile.Hash).First(&existingHash).Error

	if err == gorm.ErrRecordNotFound {
		// Content doesn't exist, create new hash record
		isNewContent = true

		// Store file physically only if it's new content
		storagePath := fmt.Sprintf("storage/%s", uploadFile.Hash)

		// Create storage directory if it doesn't exist
		fullStoragePath := filepath.Join(h.cfg.StoragePath, storagePath)
		storageDir := filepath.Dir(fullStoragePath)
		if err := os.MkdirAll(storageDir, 0755); err != nil {
			return nil, 0, 0, fmt.Errorf("failed to create storage directory: %v", err)
		}

		// Write file content to disk
		if err := os.WriteFile(fullStoragePath, uploadFile.Content, 0644); err != nil {
			return nil, 0, 0, fmt.Errorf("failed to write file to storage: %v", err)
		}

		newHash := models.FileHash{
			ID:             uuid.New(),
			Hash:           uploadFile.Hash,
			Size:           uploadFile.Size,
			StoragePath:    storagePath,
			ReferenceCount: 1,
		}

		if err := tx.Create(&newHash).Error; err != nil {
			return nil, 0, 0, fmt.Errorf("failed to save file hash: %v", err)
		}
		existingHash = newHash
	} else if err != nil {
		return nil, 0, 0, fmt.Errorf("database error: %v", err)
	} else {
		// Content already exists, increment reference count
		if err := tx.Model(&existingHash).Update("reference_count", gorm.Expr("reference_count + 1")).Error; err != nil {
			return nil, 0, 0, fmt.Errorf("failed to update reference count: %v", err)
		}
	}

	// Create file record
	fileRecord := models.File{
		BaseModel: models.BaseModel{
			ID: uuid.New(),
		},
		Filename:         generateUniqueFilename(uploadFile.Header.Filename),
		OriginalFilename: uploadFile.Header.Filename,
		MimeType:         uploadFile.MimeType,
		Size:             uploadFile.Size,
		FileHashID:       existingHash.ID,
		OwnerID:          userID,
		FolderID:         folderID,
		IsPublic:         isPublic,
	}

	if err := tx.Create(&fileRecord).Error; err != nil {
		// If file record creation fails and this was new content, decrement reference count
		if isNewContent {
			tx.Model(&models.FileHash{}).Where("hash = ?", uploadFile.Hash).Update("reference_count", gorm.Expr("reference_count - 1"))
		}
		return nil, 0, 0, fmt.Errorf("failed to create file record: %v", err)
	}

	// Calculate savings and storage
	savedBytes := int64(0)
	actualStorageUsed := int64(0)

	if !isNewContent {
		savedBytes = uploadFile.Size // User saved the full file size due to deduplication
	} else {
		actualStorageUsed = uploadFile.Size // New storage used
	}

	result := map[string]interface{}{
		"file_id":       fileRecord.ID,
		"filename":      fileRecord.Filename,
		"original_name": fileRecord.OriginalFilename,
		"size":          fileRecord.Size,
		"mime_type":     fileRecord.MimeType,
		"content_hash":  uploadFile.Hash,
		"is_duplicate":  !isNewContent,
		"saved_bytes":   savedBytes,
		"is_public":     fileRecord.IsPublic,
	}

	if uploadFile.Warning != "" {
		result["warning"] = uploadFile.Warning
	}

	return result, savedBytes, actualStorageUsed, nil
}

// updateUserStorageStats updates user storage statistics within a transaction
func (h *FileHandler) updateUserStorageStats(tx *gorm.DB, userID uuid.UUID, totalUploadedBytes, totalActualStorage, totalSavedBytes int64) error {
	var user models.User
	if err := tx.First(&user, userID).Error; err != nil {
		return fmt.Errorf("failed to find user: %v", err)
	}

	// Update user storage statistics
	user.TotalUploadedBytes += totalUploadedBytes
	user.ActualStorageBytes += totalActualStorage
	user.StorageUsed += totalActualStorage
	user.SavedBytes += totalSavedBytes

	if err := tx.Save(&user).Error; err != nil {
		return fmt.Errorf("failed to update user storage stats: %v", err)
	}

	return nil
}

// calculateContentHash calculates SHA-256 hash of file content
func (h *FileHandler) calculateContentHash(data []byte) string {
	hash := sha256.Sum256(data)
	return fmt.Sprintf("%x", hash[:])
}

// ListFiles handles listing user files with advanced search and filtering
func (h *FileHandler) ListFiles(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get search and filter parameters
	searchQuery := c.Query("search")    // Search by filename
	mimeType := c.Query("mime_type")    // Filter by MIME type
	minSize := c.Query("min_size")      // Minimum file size
	maxSize := c.Query("max_size")      // Maximum file size
	startDate := c.Query("start_date")  // Start date for date range
	endDate := c.Query("end_date")      // End date for date range
	tags := c.Query("tags")             // Filter by tags (comma-separated)
	uploaderName := c.Query("uploader") // Filter by uploader's name
	sortBy := c.Query("sort_by")        // Sort field (name, size, date, mime_type)
	sortOrder := c.Query("sort_order")  // Sort order (asc, desc)
	page := c.Query("page")             // Page number for pagination
	limit := c.Query("limit")           // Items per page

	// Get folder filter from query parameter
	folderIDStr := c.Query("folder_id")

	// Set default pagination values
	pageNum := 1
	limitNum := 50

	if page != "" {
		if p, err := strconv.Atoi(page); err == nil && p > 0 {
			pageNum = p
		}
	}

	if limit != "" {
		if l, err := strconv.Atoi(limit); err == nil && l > 0 && l <= 100 {
			limitNum = l
		}
	}

	// Build base query
	query := h.db.Model(&models.File{}).Where("is_deleted = false")

	// Handle folder filtering and permissions
	if folderIDStr != "" && folderIDStr != "root" && folderIDStr != "null" {
		folderUUID, err := uuid.Parse(folderIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid folder ID format"})
			return
		}

		// Check folder access (owned or shared)
		var folder models.Folder
		err = h.db.Where("id = ? AND owner_id = ?", folderUUID, userID).First(&folder).Error

		if err != nil {
			if err == gorm.ErrRecordNotFound {
				// Check if folder is shared with user
				var folderShare models.FolderShare
				err = h.db.Where("folder_id = ? AND shared_with = ?", folderUUID, userID).First(&folderShare).Error
				if err != nil {
					if err == gorm.ErrRecordNotFound {
						c.JSON(http.StatusNotFound, gin.H{"error": "Folder not found or access denied"})
						return
					}
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check folder access"})
					return
				}
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check folder ownership"})
				return
			}
		}

		query = query.Where("folder_id = ?", folderUUID)
	} else {
		// Show files user owns or has access to
		if folderIDStr == "root" || folderIDStr == "null" {
			query = query.Where("owner_id = ? AND folder_id IS NULL", userID)
		} else {
			// Show all files user has access to (owned + shared)
			query = query.Where("owner_id = ? OR id IN (SELECT file_id FROM file_shares WHERE shared_with = ?)", userID, userID)
		}
	}

	// Apply search filters
	if searchQuery != "" {
		searchPattern := "%" + strings.ToLower(searchQuery) + "%"
		query = query.Where("LOWER(original_filename) LIKE ? OR LOWER(description) LIKE ?", searchPattern, searchPattern)
	}

	if mimeType != "" {
		query = query.Where("mime_type LIKE ?", mimeType+"%")
	}

	// Size range filters
	if minSize != "" {
		if size, err := strconv.ParseInt(minSize, 10, 64); err == nil {
			query = query.Where("size >= ?", size)
		}
	}

	if maxSize != "" {
		if size, err := strconv.ParseInt(maxSize, 10, 64); err == nil {
			query = query.Where("size <= ?", size)
		}
	}

	// Date range filters
	if startDate != "" {
		if date, err := time.Parse("2006-01-02", startDate); err == nil {
			query = query.Where("created_at >= ?", date)
		}
	}

	if endDate != "" {
		if date, err := time.Parse("2006-01-02", endDate); err == nil {
			// Add 24 hours to include the entire end date
			endDateTime := date.Add(24 * time.Hour)
			query = query.Where("created_at < ?", endDateTime)
		}
	}

	// Tags filter (if tags are stored as JSON or comma-separated)
	if tags != "" {
		tagList := strings.Split(tags, ",")
		for _, tag := range tagList {
			tag = strings.TrimSpace(tag)
			if tag != "" {
				query = query.Where("tags LIKE ?", "%"+tag+"%")
			}
		}
	}

	// Uploader name filter (join with users table)
	if uploaderName != "" {
		uploaderPattern := "%" + strings.ToLower(uploaderName) + "%"
		query = query.Joins("JOIN users ON files.owner_id = users.id").
			Where("LOWER(users.username) LIKE ? OR LOWER(users.first_name) LIKE ? OR LOWER(users.last_name) LIKE ?",
				uploaderPattern, uploaderPattern, uploaderPattern)
	}

	// Apply sorting
	orderClause := "original_filename ASC" // default
	if sortBy != "" {
		validSortFields := map[string]string{
			"name":      "original_filename",
			"size":      "size",
			"date":      "created_at",
			"mime_type": "mime_type",
			"modified":  "updated_at",
		}

		if field, valid := validSortFields[sortBy]; valid {
			direction := "ASC"
			if sortOrder == "desc" {
				direction = "DESC"
			}
			orderClause = field + " " + direction
		}
	}

	// Get total count for pagination
	var totalCount int64
	countQuery := query
	if err := countQuery.Count(&totalCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count files"})
		return
	}

	// Apply pagination and get files
	offset := (pageNum - 1) * limitNum
	var files []models.File

	if err := query.Preload("Folder").
		Preload("Owner").
		Order(orderClause).
		Offset(offset).
		Limit(limitNum).
		Find(&files).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get files"})
		return
	}

	// Calculate pagination info
	totalPages := int((totalCount + int64(limitNum) - 1) / int64(limitNum))
	hasNext := pageNum < totalPages
	hasPrev := pageNum > 1

	c.JSON(http.StatusOK, gin.H{
		"files":       files,
		"count":       len(files),
		"total_count": totalCount,
		"pagination": gin.H{
			"current_page": pageNum,
			"total_pages":  totalPages,
			"limit":        limitNum,
			"has_next":     hasNext,
			"has_previous": hasPrev,
		},
		"filters": gin.H{
			"search":     searchQuery,
			"mime_type":  mimeType,
			"min_size":   minSize,
			"max_size":   maxSize,
			"start_date": startDate,
			"end_date":   endDate,
			"tags":       tags,
			"uploader":   uploaderName,
			"sort_by":    sortBy,
			"sort_order": sortOrder,
		},
	})
}

// GetFile handles getting a specific file
func (h *FileHandler) GetFile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	fileID := c.Param("id")

	var file models.File
	if err := h.db.Where("id = ? AND owner_id = ? AND is_deleted = false", fileID, userID).First(&file).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get file"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"file": file,
	})
}

// ViewFile serves file content for preview/viewing
func (h *FileHandler) ViewFile(c *gin.Context) {
	fmt.Printf("DEBUG ViewFile: Starting ViewFile function\n")

	userID, exists := c.Get("user_id")
	if !exists {
		fmt.Printf("DEBUG ViewFile: User not authenticated - user_id not found in context\n")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	fmt.Printf("DEBUG ViewFile: User ID from context: %v\n", userID)

	fileID := c.Param("id")
	fmt.Printf("DEBUG ViewFile: File ID from URL: %s\n", fileID)

	// Get file with its file hash information
	var file models.File
	var fileHash models.FileHash

	// First try to find as owned file
	err := h.db.Where("id = ? AND owner_id = ? AND is_deleted = false", fileID, userID).First(&file).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// If not owned, check if it's a shared file
			fmt.Printf("DEBUG ViewFile: File not owned by user, checking shared files\n")

			var fileShare models.FileShare
			err = h.db.Where("file_id = ? AND shared_with = ? AND is_active = true", fileID, userID).
				Preload("File").First(&fileShare).Error

			if err != nil {
				if err == gorm.ErrRecordNotFound {
					// If not directly shared, check if file is in a shared folder
					fmt.Printf("DEBUG ViewFile: File not directly shared, checking if file is in a shared folder\n")

					// First get the file to check its folder
					var tempFile models.File
					err = h.db.Where("id = ? AND is_deleted = false", fileID).First(&tempFile).Error
					if err != nil {
						if err == gorm.ErrRecordNotFound {
							fmt.Printf("DEBUG ViewFile: File not found at all: %s\n", fileID)
							c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
							return
						}
						fmt.Printf("DEBUG ViewFile: Database error getting file for folder check: %v\n", err)
						c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get file"})
						return
					}

					// Check if the file's folder is shared with the user
					if tempFile.FolderID != nil {
						var folderShare models.FolderShare
						err = h.db.Where("folder_id = ? AND shared_with = ?", tempFile.FolderID, userID).First(&folderShare).Error
						if err != nil {
							if err == gorm.ErrRecordNotFound {
								fmt.Printf("DEBUG ViewFile: File's folder not shared with user: folder_id=%v\n", tempFile.FolderID)
								c.JSON(http.StatusNotFound, gin.H{"error": "File not found or access denied"})
								return
							}
							fmt.Printf("DEBUG ViewFile: Database error checking folder sharing: %v\n", err)
							c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check folder access"})
							return
						}

						// User has access to the folder, so they can view the file
						file = tempFile
						fmt.Printf("DEBUG ViewFile: Found file in shared folder: %s, FolderShare Permission: %s\n", file.ID, folderShare.Permission)
					} else {
						fmt.Printf("DEBUG ViewFile: File has no folder and is not directly shared: %s\n", fileID)
						c.JSON(http.StatusNotFound, gin.H{"error": "File not found or access denied"})
						return
					}
				} else {
					fmt.Printf("DEBUG ViewFile: Database error getting shared file: %v\n", err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get file"})
					return
				}
			} else {
				// Use the shared file
				file = fileShare.File
				fmt.Printf("DEBUG ViewFile: Found shared file: %s, Permission: %s\n", file.ID, fileShare.Permission)
			}
		} else {
			fmt.Printf("DEBUG ViewFile: Database error getting owned file: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get file"})
			return
		}
	}

	fmt.Printf("DEBUG ViewFile: Found file: %s, FileHashID: %s\n", file.ID, file.FileHashID)

	// Get the file hash record to find the storage path
	fmt.Printf("DEBUG ViewFile: Looking up file hash with ID: %s\n", file.FileHashID)
	if err := h.db.Where("id = ?", file.FileHashID).First(&fileHash).Error; err != nil {
		fmt.Printf("DEBUG ViewFile: Failed to get file hash: %v\n", err)
		if err == gorm.ErrRecordNotFound {
			fmt.Printf("DEBUG ViewFile: File hash record not found for ID: %s\n", file.FileHashID)
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get file storage information",
			"debug": fmt.Sprintf("FileHashID: %s, Error: %v", file.FileHashID, err),
		})
		return
	}

	fmt.Printf("DEBUG ViewFile: Found file hash: %s, StoragePath: %s\n", fileHash.ID, fileHash.StoragePath)

	// First try the new storage path structure (storage/{hash})
	filePath := filepath.Join(h.cfg.StoragePath, fileHash.StoragePath)

	// Debug logging
	fmt.Printf("DEBUG ViewFile: StoragePath=%s, fileHash.StoragePath=%s, filePath=%s\n",
		h.cfg.StoragePath, fileHash.StoragePath, filePath)

	// Check if file exists at new location
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		fmt.Printf("DEBUG ViewFile: File does not exist at new path: %s\n", filePath)

		// Try legacy storage pattern (direct UUID filename)
		legacyFilePath := filepath.Join(h.cfg.StoragePath, file.ID.String())
		fmt.Printf("DEBUG ViewFile: Trying legacy path: %s\n", legacyFilePath)

		if _, err := os.Stat(legacyFilePath); os.IsNotExist(err) {
			fmt.Printf("DEBUG ViewFile: File does not exist at legacy path either: %s\n", legacyFilePath)
			c.JSON(http.StatusNotFound, gin.H{
				"error": "File not found on disk",
				"debug": fmt.Sprintf("StoragePath: %s, FileHashPath: %s, FullPath: %s, LegacyPath: %s", h.cfg.StoragePath, fileHash.StoragePath, filePath, legacyFilePath),
			})
			return
		}

		// Use legacy path
		filePath = legacyFilePath
		fmt.Printf("DEBUG ViewFile: Using legacy file path: %s\n", filePath)
	}

	// Set appropriate headers for inline viewing
	c.Header("Content-Type", file.MimeType)
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", file.OriginalFilename))
	c.Header("Cache-Control", "max-age=3600") // Cache for 1 hour

	// Record download/view statistics
	var userIDPtr *uuid.UUID
	if userID != nil {
		if uid, ok := userID.(uuid.UUID); ok {
			userIDPtr = &uid
		}
	}
	h.recordDownload(file.ID, userIDPtr, nil, c)

	// Serve the file
	c.File(filePath)
}

// ViewPublicFile serves public file content for preview/viewing without authentication
func (h *FileHandler) ViewPublicFile(c *gin.Context) {
	fileID := c.Param("id")

	// Get public file information
	var file models.File
	var fileHash models.FileHash

	// Check if file exists and is public
	err := h.db.Where("id = ? AND is_public = true AND is_deleted = false", fileID).First(&file).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Public file not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get file"})
		return
	}

	// Get the file hash record to find the storage path
	if err := h.db.Where("id = ?", file.FileHashID).First(&fileHash).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get file storage information"})
		return
	}

	// First try the new storage path structure (storage/{hash})
	filePath := filepath.Join(h.cfg.StoragePath, fileHash.StoragePath)

	// Check if file exists at new location
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		// Try legacy storage pattern (direct UUID filename)
		legacyFilePath := filepath.Join(h.cfg.StoragePath, file.ID.String())
		if _, err := os.Stat(legacyFilePath); os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found on disk"})
			return
		}
		filePath = legacyFilePath
	}

	// Set appropriate headers for inline viewing
	c.Header("Content-Type", file.MimeType)
	c.Header("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", file.OriginalFilename))
	c.Header("Cache-Control", "max-age=3600") // Cache for 1 hour

	// Record download/view statistics (no user ID for public access)
	h.recordDownload(file.ID, nil, nil, c)

	// Serve the file
	c.File(filePath)
}

// DownloadFile serves file content for download (attachment)
func (h *FileHandler) DownloadFile(c *gin.Context) {
	fmt.Printf("DEBUG DownloadFile: Starting DownloadFile function\n")

	userID, exists := c.Get("user_id")
	if !exists {
		fmt.Printf("DEBUG DownloadFile: User not authenticated - user_id not found in context\n")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	fmt.Printf("DEBUG DownloadFile: User ID from context: %v\n", userID)

	fileID := c.Param("id")
	fmt.Printf("DEBUG DownloadFile: File ID from URL: %s\n", fileID)

	// Get file with its file hash information (reuse ViewFile logic)
	var file models.File
	var fileHash models.FileHash

	// First try to find as owned file
	err := h.db.Where("id = ? AND owner_id = ? AND is_deleted = false", fileID, userID).First(&file).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// If not owned, check if it's a shared file
			fmt.Printf("DEBUG DownloadFile: File not owned by user, checking shared files\n")

			var fileShare models.FileShare
			err = h.db.Where("file_id = ? AND shared_with = ? AND is_active = true", fileID, userID).
				Preload("File").First(&fileShare).Error

			if err != nil {
				if err == gorm.ErrRecordNotFound {
					// If not directly shared, check if file is in a shared folder
					fmt.Printf("DEBUG DownloadFile: File not directly shared, checking if file is in a shared folder\n")

					// First get the file to check its folder
					var tempFile models.File
					err = h.db.Where("id = ? AND is_deleted = false", fileID).First(&tempFile).Error
					if err != nil {
						if err == gorm.ErrRecordNotFound {
							fmt.Printf("DEBUG DownloadFile: File not found at all: %s\n", fileID)
							c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
							return
						}
						fmt.Printf("DEBUG DownloadFile: Database error getting file for folder check: %v\n", err)
						c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get file"})
						return
					}

					// Check if the file's folder is shared with the user
					if tempFile.FolderID != nil {
						var folderShare models.FolderShare
						err = h.db.Where("folder_id = ? AND shared_with = ?", tempFile.FolderID, userID).First(&folderShare).Error
						if err != nil {
							if err == gorm.ErrRecordNotFound {
								fmt.Printf("DEBUG DownloadFile: File's folder not shared with user: folder_id=%v\n", tempFile.FolderID)
								c.JSON(http.StatusNotFound, gin.H{"error": "File not found or access denied"})
								return
							}
							fmt.Printf("DEBUG DownloadFile: Database error checking folder sharing: %v\n", err)
							c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check folder access"})
							return
						}

						// User has access to the folder, so they can download the file
						file = tempFile
						fmt.Printf("DEBUG DownloadFile: Found file in shared folder: %s, FolderShare Permission: %s\n", file.ID, folderShare.Permission)
					} else {
						fmt.Printf("DEBUG DownloadFile: File has no folder and is not directly shared: %s\n", fileID)
						c.JSON(http.StatusNotFound, gin.H{"error": "File not found or access denied"})
						return
					}
				} else {
					fmt.Printf("DEBUG DownloadFile: Database error getting shared file: %v\n", err)
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get file"})
					return
				}
			} else {
				// Use the shared file
				file = fileShare.File
				fmt.Printf("DEBUG DownloadFile: Found shared file: %s, Permission: %s\n", file.ID, fileShare.Permission)
			}
		} else {
			fmt.Printf("DEBUG DownloadFile: Database error getting owned file: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get file"})
			return
		}
	}

	fmt.Printf("DEBUG DownloadFile: Found file: %s, FileHashID: %s\n", file.ID, file.FileHashID)

	// Get the file hash record to find the storage path
	fmt.Printf("DEBUG DownloadFile: Looking up file hash with ID: %s\n", file.FileHashID)
	if err := h.db.Where("id = ?", file.FileHashID).First(&fileHash).Error; err != nil {
		fmt.Printf("DEBUG DownloadFile: Failed to get file hash: %v\n", err)
		if err == gorm.ErrRecordNotFound {
			fmt.Printf("DEBUG DownloadFile: File hash record not found for ID: %s\n", file.FileHashID)
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get file storage information",
			"debug": fmt.Sprintf("FileHashID: %s, Error: %v", file.FileHashID, err),
		})
		return
	}

	fmt.Printf("DEBUG DownloadFile: Found file hash: %s, StoragePath: %s\n", fileHash.ID, fileHash.StoragePath)

	// First try the new storage path structure (storage/{hash})
	filePath := filepath.Join(h.cfg.StoragePath, fileHash.StoragePath)

	// Debug logging
	fmt.Printf("DEBUG DownloadFile: StoragePath=%s, fileHash.StoragePath=%s, filePath=%s\n",
		h.cfg.StoragePath, fileHash.StoragePath, filePath)

	// Check if file exists at new location
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		fmt.Printf("DEBUG DownloadFile: File does not exist at new path: %s\n", filePath)

		// Try legacy storage pattern (direct UUID filename)
		legacyFilePath := filepath.Join(h.cfg.StoragePath, file.ID.String())
		fmt.Printf("DEBUG DownloadFile: Trying legacy path: %s\n", legacyFilePath)

		if _, err := os.Stat(legacyFilePath); os.IsNotExist(err) {
			fmt.Printf("DEBUG DownloadFile: File does not exist at legacy path either: %s\n", legacyFilePath)
			c.JSON(http.StatusNotFound, gin.H{
				"error": "File not found on disk",
				"debug": fmt.Sprintf("StoragePath: %s, FileHashPath: %s, FullPath: %s, LegacyPath: %s", h.cfg.StoragePath, fileHash.StoragePath, filePath, legacyFilePath),
			})
			return
		}

		// Use legacy path
		filePath = legacyFilePath
		fmt.Printf("DEBUG DownloadFile: Using legacy file path: %s\n", filePath)
	}

	// Set appropriate headers for download (attachment)
	c.Header("Content-Type", file.MimeType)
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", file.OriginalFilename))
	c.Header("Cache-Control", "no-cache")

	// Record download statistics
	var userIDPtr *uuid.UUID
	if userID != nil {
		if uid, ok := userID.(uuid.UUID); ok {
			userIDPtr = &uid
		}
	}
	h.recordDownload(file.ID, userIDPtr, nil, c)

	// Log audit activity for download
	if h.auditService != nil && userIDPtr != nil {
		go func() {
			if err := h.auditService.LogFileDownload(c, *userIDPtr, file.ID, file.OriginalFilename, file.Size); err != nil {
				fmt.Printf("Failed to log download audit: %v\n", err)
			}
		}()
	}

	// Serve the file
	c.File(filePath)
}

// DownloadPublicFile serves public file content for download without authentication
func (h *FileHandler) DownloadPublicFile(c *gin.Context) {
	fileID := c.Param("id")

	// Get public file information
	var file models.File
	var fileHash models.FileHash

	// Check if file exists and is public
	err := h.db.Where("id = ? AND is_public = true AND is_deleted = false", fileID).First(&file).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Public file not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get file"})
		return
	}

	// Get the file hash record to find the storage path
	if err := h.db.Where("id = ?", file.FileHashID).First(&fileHash).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get file storage information"})
		return
	}

	// First try the new storage path structure (storage/{hash})
	filePath := filepath.Join(h.cfg.StoragePath, fileHash.StoragePath)

	// Check if file exists at new location
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		// Try legacy storage pattern (direct UUID filename)
		legacyFilePath := filepath.Join(h.cfg.StoragePath, file.ID.String())
		if _, err := os.Stat(legacyFilePath); os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found on disk"})
			return
		}
		filePath = legacyFilePath
	}

	// Set appropriate headers for download (attachment)
	c.Header("Content-Type", file.MimeType)
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", file.OriginalFilename))
	c.Header("Cache-Control", "no-cache")

	// Record download statistics (no user ID for public access)
	h.recordDownload(file.ID, nil, nil, c)

	// Serve the file
	c.File(filePath)
}

// DeleteFile handles file deletion with deduplication cleanup
func (h *FileHandler) DeleteFile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	fileID := c.Param("id")

	var file models.File
	if err := h.db.Where("id = ? AND owner_id = ? AND is_deleted = false", fileID, userID).First(&file).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get file"})
		return
	}

	// Start transaction for consistent deduplication cleanup
	tx := h.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Mark file as deleted
	if err := tx.Model(&file).Updates(map[string]interface{}{
		"is_deleted": true,
		"deleted_at": time.Now(),
		"updated_at": time.Now(),
	}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file"})
		return
	}

	// Decrease reference count for the file hash
	var fileHash models.FileHash
	if err := tx.Where("id = ?", file.FileHashID).First(&fileHash).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find file hash"})
		return
	}

	// Decrement reference count
	newRefCount := fileHash.ReferenceCount - 1
	if err := tx.Model(&fileHash).Update("reference_count", newRefCount).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update reference count"})
		return
	}

	// If no more references, delete the hash record
	actualStorageFreed := int64(0)
	if newRefCount <= 0 {
		if err := tx.Delete(&fileHash).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file hash"})
			return
		}
		actualStorageFreed = file.Size
	}

	// Update user storage statistics
	var user models.User
	if err := tx.First(&user, "id = ?", userID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user"})
		return
	}

	updates := map[string]interface{}{
		"storage_used":         gorm.Expr("storage_used - ?", file.Size),
		"actual_storage_bytes": gorm.Expr("actual_storage_bytes - ?", actualStorageFreed),
	}

	if err := tx.Model(&user).Updates(updates).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user storage stats"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	// Log audit activity for file deletion
	if h.auditService != nil {
		go func() {
			if err := h.auditService.LogFileDelete(c, userID.(uuid.UUID), file.ID, file.OriginalFilename); err != nil {
				fmt.Printf("Failed to log delete audit: %v\n", err)
			}
		}()
	}

	c.JSON(http.StatusOK, gin.H{
		"message":               "File deleted successfully",
		"actual_storage_freed":  actualStorageFreed,
		"logical_storage_freed": file.Size,
	})
}

// MoveFile moves a file to a different folder
func (h *FileHandler) MoveFile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	fileID := c.Param("id")
	fileUUID, err := uuid.Parse(fileID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file ID"})
		return
	}

	var req struct {
		FolderID *uuid.UUID `json:"folder_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input", "details": err.Error()})
		return
	}

	// Get the file
	var file models.File
	if err := h.db.Where("id = ? AND owner_id = ? AND is_deleted = false", fileUUID, userID).First(&file).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve file"})
		return
	}

	// Validate target folder if provided
	if req.FolderID != nil {
		var targetFolder models.Folder
		if err := h.db.Where("id = ? AND owner_id = ?", req.FolderID, userID).First(&targetFolder).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusNotFound, gin.H{"error": "Target folder not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify target folder"})
			return
		}
	}

	// Update file folder
	if err := h.db.Model(&file).Update("folder_id", req.FolderID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to move file"})
		return
	}

	// Reload file with folder information
	h.db.Preload("Folder").First(&file, fileUUID)

	c.JSON(http.StatusOK, gin.H{
		"message": "File moved successfully",
		"file":    file,
	})
}

// GetStorageSavings returns storage savings information for a user
func (h *FileHandler) GetStorageSavings(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var user models.User
	if err := h.db.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user"})
		return
	}

	savingsPercent := float64(0)
	if user.TotalUploadedBytes > 0 {
		savingsPercent = (float64(user.SavedBytes) / float64(user.TotalUploadedBytes)) * 100
	}

	c.JSON(http.StatusOK, gin.H{
		"total_uploaded_bytes": user.TotalUploadedBytes,
		"actual_storage_bytes": user.ActualStorageBytes,
		"saved_bytes":          user.SavedBytes,
		"savings_percent":      savingsPercent,
	})
}

// GetPublicFiles returns all public files with pagination and search
func (h *FileHandler) GetPublicFiles(c *gin.Context) {
	// Get pagination parameters
	page := 1
	limit := 20
	search := ""

	if p := c.Query("page"); p != "" {
		if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
			page = parsed
		}
	}

	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	if s := c.Query("search"); s != "" {
		search = strings.TrimSpace(s)
	}

	offset := (page - 1) * limit

	// Build query for public files
	query := h.db.Model(&models.File{}).
		Where("is_public = true AND is_deleted = false").
		Preload("Owner").
		Preload("FileHash")

	// Add search filter if provided
	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(original_filename) LIKE ? OR LOWER(description) LIKE ?", searchPattern, searchPattern)
	}

	// Get total count
	var totalCount int64
	query.Count(&totalCount)

	// Get files with pagination
	var files []models.File
	if err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&files).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch public files"})
		return
	}

	// Calculate download counts for each file and mark admin files
	for i := range files {
		var downloadCount int64
		h.db.Model(&models.DownloadStat{}).Where("file_id = ?", files[i].ID).Count(&downloadCount)
		files[i].ShareCount = int(downloadCount) // Using ShareCount field to store download count for public files

		// Add admin indicator to the Owner information if it's loaded
		if files[i].Owner.Role == models.RoleAdmin {
			// This information will be available in the Owner field that's already preloaded
		}
	}

	// Calculate pagination info
	totalPages := int((totalCount + int64(limit) - 1) / int64(limit))
	hasNext := page < totalPages
	hasPrev := page > 1

	c.JSON(http.StatusOK, gin.H{
		"files": files,
		"pagination": gin.H{
			"current_page": page,
			"total_pages":  totalPages,
			"total_count":  totalCount,
			"has_next":     hasNext,
			"has_prev":     hasPrev,
			"limit":        limit,
		},
	})
}

// SearchFiles provides advanced search functionality with multiple filters
func (h *FileHandler) SearchFiles(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Parse search parameters from JSON body for complex queries
	var searchReq struct {
		Query         string   `json:"query"`          // Search query for filename/description
		MimeTypes     []string `json:"mime_types"`     // Array of MIME types
		MinSize       *int64   `json:"min_size"`       // Minimum file size in bytes
		MaxSize       *int64   `json:"max_size"`       // Maximum file size in bytes
		StartDate     *string  `json:"start_date"`     // Start date (YYYY-MM-DD)
		EndDate       *string  `json:"end_date"`       // End date (YYYY-MM-DD)
		Tags          []string `json:"tags"`           // Array of tags
		Uploaders     []string `json:"uploaders"`      // Array of uploader usernames
		FolderIDs     []string `json:"folder_ids"`     // Array of folder IDs to search in
		SortBy        string   `json:"sort_by"`        // Sort field
		SortOrder     string   `json:"sort_order"`     // Sort direction
		Page          int      `json:"page"`           // Page number
		Limit         int      `json:"limit"`          // Items per page
		IncludeShared bool     `json:"include_shared"` // Include files shared with user
	}

	// Try to parse JSON body, fall back to query parameters if not provided
	if err := c.ShouldBindJSON(&searchReq); err != nil {
		// Fallback to query parameters
		searchReq.Query = c.Query("query")
		if mimeType := c.Query("mime_type"); mimeType != "" {
			searchReq.MimeTypes = strings.Split(mimeType, ",")
		}
		if minSize := c.Query("min_size"); minSize != "" {
			if size, err := strconv.ParseInt(minSize, 10, 64); err == nil {
				searchReq.MinSize = &size
			}
		}
		if maxSize := c.Query("max_size"); maxSize != "" {
			if size, err := strconv.ParseInt(maxSize, 10, 64); err == nil {
				searchReq.MaxSize = &size
			}
		}
		if startDate := c.Query("start_date"); startDate != "" {
			searchReq.StartDate = &startDate
		}
		if endDate := c.Query("end_date"); endDate != "" {
			searchReq.EndDate = &endDate
		}
		if tags := c.Query("tags"); tags != "" {
			searchReq.Tags = strings.Split(tags, ",")
		}
		if uploaders := c.Query("uploaders"); uploaders != "" {
			searchReq.Uploaders = strings.Split(uploaders, ",")
		}
		if folderIDs := c.Query("folder_ids"); folderIDs != "" {
			searchReq.FolderIDs = strings.Split(folderIDs, ",")
		}
		searchReq.SortBy = c.Query("sort_by")
		searchReq.SortOrder = c.Query("sort_order")
		if page := c.Query("page"); page != "" {
			if p, err := strconv.Atoi(page); err == nil {
				searchReq.Page = p
			}
		}
		if limit := c.Query("limit"); limit != "" {
			if l, err := strconv.Atoi(limit); err == nil {
				searchReq.Limit = l
			}
		}
		searchReq.IncludeShared = c.Query("include_shared") == "true"
	}

	// Set defaults
	if searchReq.Page <= 0 {
		searchReq.Page = 1
	}
	if searchReq.Limit <= 0 || searchReq.Limit > 100 {
		searchReq.Limit = 50
	}

	// Build optimized query with indexes
	query := h.db.Model(&models.File{}).Where("is_deleted = false")

	// User access control
	if searchReq.IncludeShared {
		// Include owned files and files shared with user
		query = query.Where("owner_id = ? OR id IN (SELECT file_id FROM file_shares WHERE shared_with = ?)", userID, userID)
	} else {
		// Only owned files
		query = query.Where("owner_id = ?", userID)
	}

	// Text search with full-text search capabilities
	if searchReq.Query != "" {
		searchPattern := "%" + strings.ToLower(searchReq.Query) + "%"
		query = query.Where("(LOWER(original_filename) LIKE ? OR LOWER(description) LIKE ?)", searchPattern, searchPattern)
	}

	// MIME type filter (optimized with IN clause)
	if len(searchReq.MimeTypes) > 0 {
		mimeConditions := make([]string, len(searchReq.MimeTypes))
		mimeArgs := make([]interface{}, len(searchReq.MimeTypes))
		for i, mimeType := range searchReq.MimeTypes {
			mimeConditions[i] = "mime_type LIKE ?"
			mimeArgs[i] = strings.TrimSpace(mimeType) + "%"
		}
		query = query.Where("("+strings.Join(mimeConditions, " OR ")+")", mimeArgs...)
	}

	// Size range filters (indexed on size column)
	if searchReq.MinSize != nil {
		query = query.Where("size >= ?", *searchReq.MinSize)
	}
	if searchReq.MaxSize != nil {
		query = query.Where("size <= ?", *searchReq.MaxSize)
	}

	// Date range filters (indexed on created_at)
	if searchReq.StartDate != nil {
		if date, err := time.Parse("2006-01-02", *searchReq.StartDate); err == nil {
			query = query.Where("created_at >= ?", date)
		}
	}
	if searchReq.EndDate != nil {
		if date, err := time.Parse("2006-01-02", *searchReq.EndDate); err == nil {
			endDateTime := date.Add(24 * time.Hour)
			query = query.Where("created_at < ?", endDateTime)
		}
	}

	// Tags filter (if using JSON column or comma-separated)
	if len(searchReq.Tags) > 0 {
		tagConditions := make([]string, len(searchReq.Tags))
		tagArgs := make([]interface{}, len(searchReq.Tags))
		for i, tag := range searchReq.Tags {
			tagConditions[i] = "tags LIKE ?"
			tagArgs[i] = "%" + strings.TrimSpace(tag) + "%"
		}
		query = query.Where("("+strings.Join(tagConditions, " OR ")+")", tagArgs...)
	}

	// Folder filter
	if len(searchReq.FolderIDs) > 0 {
		folderUUIDs := make([]uuid.UUID, 0)
		for _, folderID := range searchReq.FolderIDs {
			if folderUUID, err := uuid.Parse(strings.TrimSpace(folderID)); err == nil {
				folderUUIDs = append(folderUUIDs, folderUUID)
			}
		}
		if len(folderUUIDs) > 0 {
			query = query.Where("folder_id IN ?", folderUUIDs)
		}
	}

	// Uploader filter (join with users table)
	if len(searchReq.Uploaders) > 0 {
		uploaderConditions := make([]string, 0)
		uploaderArgs := make([]interface{}, 0)

		for _, uploader := range searchReq.Uploaders {
			uploader = strings.TrimSpace(strings.ToLower(uploader))
			if uploader != "" {
				uploaderConditions = append(uploaderConditions,
					"(LOWER(users.username) LIKE ? OR LOWER(users.first_name) LIKE ? OR LOWER(users.last_name) LIKE ?)")
				pattern := "%" + uploader + "%"
				uploaderArgs = append(uploaderArgs, pattern, pattern, pattern)
			}
		}

		if len(uploaderConditions) > 0 {
			query = query.Joins("JOIN users ON files.owner_id = users.id").
				Where("("+strings.Join(uploaderConditions, " OR ")+")", uploaderArgs...)
		}
	}

	// Sorting with performance optimization
	orderClause := "files.original_filename ASC"
	if searchReq.SortBy != "" {
		validSortFields := map[string]string{
			"name":     "files.original_filename",
			"size":     "files.size",
			"date":     "files.created_at",
			"modified": "files.updated_at",
			"mime":     "files.mime_type",
			"owner":    "users.username",
		}

		if field, valid := validSortFields[searchReq.SortBy]; valid {
			direction := "ASC"
			if strings.ToLower(searchReq.SortOrder) == "desc" {
				direction = "DESC"
			}
			orderClause = field + " " + direction
		}
	}

	// Get total count for pagination (optimized count query)
	var totalCount int64
	countQuery := query
	if err := countQuery.Count(&totalCount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count search results"})
		return
	}

	// Apply pagination and execute query
	offset := (searchReq.Page - 1) * searchReq.Limit
	var files []models.File

	finalQuery := query.Preload("Folder").
		Preload("Owner").
		Order(orderClause).
		Offset(offset).
		Limit(searchReq.Limit)

	if err := finalQuery.Find(&files).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to execute search"})
		return
	}

	// Calculate pagination metadata
	totalPages := int((totalCount + int64(searchReq.Limit) - 1) / int64(searchReq.Limit))
	hasNext := searchReq.Page < totalPages
	hasPrev := searchReq.Page > 1

	// Prepare response with search metadata
	response := gin.H{
		"files":       files,
		"count":       len(files),
		"total_count": totalCount,
		"pagination": gin.H{
			"current_page":  searchReq.Page,
			"total_pages":   totalPages,
			"limit":         searchReq.Limit,
			"has_next":      hasNext,
			"has_previous":  hasPrev,
			"total_results": totalCount,
		},
		"search_metadata": gin.H{
			"query": searchReq.Query,
			"filters_applied": map[string]interface{}{
				"mime_types":     searchReq.MimeTypes,
				"size_range":     map[string]interface{}{"min": searchReq.MinSize, "max": searchReq.MaxSize},
				"date_range":     map[string]interface{}{"start": searchReq.StartDate, "end": searchReq.EndDate},
				"tags":           searchReq.Tags,
				"uploaders":      searchReq.Uploaders,
				"folders":        searchReq.FolderIDs,
				"include_shared": searchReq.IncludeShared,
			},
			"sort": map[string]string{
				"field": searchReq.SortBy,
				"order": searchReq.SortOrder,
			},
		},
	}

	c.JSON(http.StatusOK, response)
}

// Helper function to generate unique filename
func generateUniqueFilename(originalFilename string) string {
	ext := filepath.Ext(originalFilename)
	name := strings.TrimSuffix(originalFilename, ext)
	timestamp := time.Now().Unix()
	return fmt.Sprintf("%s_%d%s", name, timestamp, ext)
}
