package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"file-vault-system/backend/internal/models"
	"file-vault-system/backend/internal/services"
)

type FolderSharingHandler struct {
	db                   *gorm.DB
	folderSharingService *services.FolderSharingService
}

func NewFolderSharingHandler(db *gorm.DB, folderSharingService *services.FolderSharingService) *FolderSharingHandler {
	return &FolderSharingHandler{
		db:                   db,
		folderSharingService: folderSharingService,
	}
}

// Request/Response structs
type ShareFolderRequest struct {
	FolderID        string `json:"folderId" binding:"required"`
	SharedWithEmail string `json:"sharedWithEmail" binding:"required,email"`
	Permission      string `json:"permission" binding:"required"`
	Message         string `json:"message"`
}

type CreateFolderShareLinkRequest struct {
	FolderID   string `json:"folderId" binding:"required"`
	Permission string `json:"permission" binding:"required"`
	ExpiresAt  string `json:"expiresAt"` // Optional expiration date
	Password   string `json:"password"`  // Optional password protection
}

// ShareFolderWithUser creates an internal share between users
func (h *FolderSharingHandler) ShareFolderWithUser(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req ShareFolderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse folder ID
	folderID, err := uuid.Parse(req.FolderID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid folder ID"})
		return
	}

	// Validate permission
	permission := models.SharePermission(req.Permission)
	if permission != models.PermissionView && permission != models.PermissionDownload {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid permission. Must be 'view' or 'download'"})
		return
	}

	// Find target user by email
	var targetUser models.User
	if err := h.db.Where("email = ?", req.SharedWithEmail).First(&targetUser).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "User with this email not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find user"})
		}
		return
	}

	// Use service to create the share
	share, err := h.folderSharingService.ShareFolderWithUser(
		folderID,
		userID.(uuid.UUID),
		targetUser.ID,
		permission,
		req.Message,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Folder shared successfully",
		"share":   share,
	})
}

// CreateFolderShareLink creates a shareable link for external sharing
func (h *FolderSharingHandler) CreateFolderShareLink(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req CreateFolderShareLinkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse folder ID
	folderID, err := uuid.Parse(req.FolderID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid folder ID"})
		return
	}

	// Validate permission
	permission := models.SharePermission(req.Permission)
	if permission != models.PermissionView && permission != models.PermissionDownload {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid permission. Must be 'view' or 'download'"})
		return
	}

	// Parse expiration date if provided
	var expiresAt *time.Time
	if req.ExpiresAt != "" {
		parsed, err := time.Parse(time.RFC3339, req.ExpiresAt)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expiration date format"})
			return
		}
		expiresAt = &parsed
	}

	// Use service to create the share link
	shareLink, err := h.folderSharingService.CreateFolderShareLink(
		folderID,
		userID.(uuid.UUID),
		permission,
		expiresAt,
		req.Password,
		nil, // maxDownloads - not implemented in the request, could be added later
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":   "Share link created successfully",
		"shareLink": shareLink,
	})
}

// GetSharedFolders returns folders shared with the current user
func (h *FolderSharingHandler) GetSharedFolders(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	sharedFolders, err := h.folderSharingService.GetSharedFolders(userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"sharedFolders": sharedFolders,
	})
}

// GetFolderShares returns all shares for folders owned by the current user
func (h *FolderSharingHandler) GetFolderShares(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get all folders owned by the user and their shares
	var folderShares []models.FolderShare
	err := h.db.Joins("JOIN folders ON folders.id = folder_shares.folder_id").
		Where("folders.owner_id = ?", userID).
		Preload("Folder").
		Preload("SharedWithUser").
		Find(&folderShares).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"folderShares": folderShares,
	})
}

// GetFolderShareLinks returns all share links for folders owned by the current user
func (h *FolderSharingHandler) GetFolderShareLinks(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	shareLinks, err := h.folderSharingService.GetFolderShareLinks(userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"shareLinks": shareLinks,
	})
}

// RemoveFolderShare removes a folder share
func (h *FolderSharingHandler) RemoveFolderShare(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	shareIDStr := c.Param("id")
	shareID, err := uuid.Parse(shareIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid share ID"})
		return
	}

	err = h.folderSharingService.RevokeFolderShare(shareID, userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Folder share removed successfully",
	})
}

// RemoveFolderShareLink removes a folder share link
func (h *FolderSharingHandler) RemoveFolderShareLink(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	linkIDStr := c.Param("id")
	linkID, err := uuid.Parse(linkIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid link ID"})
		return
	}

	err = h.folderSharingService.RevokeFolderShareLink(linkID, userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Folder share link removed successfully",
	})
}

// AccessSharedFolderByLink provides public access to shared folders via link
func (h *FolderSharingHandler) AccessSharedFolderByLink(c *gin.Context) {
	token := c.Param("token")
	password := c.Query("password") // Optional password

	shareLink, err := h.folderSharingService.AccessFolderByToken(token, password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Log access
	h.folderSharingService.LogFolderShareLinkAccess(shareLink.ID, c.ClientIP(), c.GetHeader("User-Agent"), "view")

	// Get the folder
	var folder models.Folder
	if err := h.db.Preload("Files").Where("id = ?", shareLink.FolderID).First(&folder).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Folder not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"folder":    folder,
		"shareLink": shareLink,
	})
}
