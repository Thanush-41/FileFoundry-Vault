package services

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"file-vault-system/backend/internal/models"
)

type FolderSharingService struct {
	db *gorm.DB
}

func NewFolderSharingService(db *gorm.DB) *FolderSharingService {
	return &FolderSharingService{
		db: db,
	}
}

// ShareFolderWithUser shares a folder with another user
func (s *FolderSharingService) ShareFolderWithUser(folderID, sharedBy, sharedWith uuid.UUID, permission models.SharePermission, message string) (*models.FolderShare, error) {
	// Check if folder exists and belongs to the user
	var folder models.Folder
	if err := s.db.Where("id = ? AND owner_id = ?", folderID, sharedBy).First(&folder).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("folder not found or access denied")
		}
		return nil, err
	}

	// Check if target user exists
	var targetUser models.User
	if err := s.db.Where("id = ?", sharedWith).First(&targetUser).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("target user not found")
		}
		return nil, err
	}

	// Check if already shared
	var existingShare models.FolderShare
	if err := s.db.Where("folder_id = ? AND shared_by = ? AND shared_with = ? AND deleted_at IS NULL",
		folderID, sharedBy, sharedWith).First(&existingShare).Error; err == nil {
		return nil, errors.New("folder already shared with this user")
	}

	// Create folder share
	folderShare := models.FolderShare{
		FolderID:   folderID,
		SharedBy:   sharedBy,
		SharedWith: sharedWith,
		Permission: permission,
		Message:    message,
	}

	if err := s.db.Create(&folderShare).Error; err != nil {
		return nil, err
	}

	// Load relationships
	if err := s.db.Preload("Folder").Preload("SharedByUser").Preload("SharedWithUser").
		First(&folderShare, folderShare.ID).Error; err != nil {
		return nil, err
	}

	return &folderShare, nil
}

// CreateFolderShareLink creates a shareable link for a folder
func (s *FolderSharingService) CreateFolderShareLink(folderID, createdBy uuid.UUID, permission models.SharePermission, expiresAt *time.Time, password string, maxDownloads *int) (*models.FolderShareLink, error) {
	// Check if folder exists and belongs to the user
	var folder models.Folder
	if err := s.db.Where("id = ? AND owner_id = ?", folderID, createdBy).First(&folder).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("folder not found or access denied")
		}
		return nil, err
	}

	// Generate unique token
	token, err := generateSecureToken(32)
	if err != nil {
		return nil, err
	}

	// Hash password if provided
	var passwordHash string
	if password != "" {
		hash, err := hashPassword(password)
		if err != nil {
			return nil, err
		}
		passwordHash = hash
	}

	// Create folder share link
	shareLink := models.FolderShareLink{
		FolderID:      folderID,
		CreatedBy:     createdBy,
		Token:         token,
		PasswordHash:  passwordHash,
		Permission:    permission,
		ExpiresAt:     expiresAt,
		IsActive:      true,
		MaxDownloads:  maxDownloads,
		DownloadCount: 0,
	}

	if err := s.db.Create(&shareLink).Error; err != nil {
		return nil, err
	}

	// Load relationships
	if err := s.db.Preload("Folder").Preload("CreatedByUser").
		First(&shareLink, shareLink.ID).Error; err != nil {
		return nil, err
	}

	return &shareLink, nil
}

// GetSharedFolders returns folders shared with a user
func (s *FolderSharingService) GetSharedFolders(userID uuid.UUID) ([]models.FolderShare, error) {
	var folderShares []models.FolderShare

	if err := s.db.Where("shared_with = ? AND deleted_at IS NULL", userID).
		Preload("Folder").
		Preload("SharedByUser").
		Find(&folderShares).Error; err != nil {
		return nil, err
	}

	return folderShares, nil
}

// GetFolderShares returns all shares for a specific folder
func (s *FolderSharingService) GetFolderShares(folderID, ownerID uuid.UUID) ([]models.FolderShare, error) {
	// Verify folder ownership
	var folder models.Folder
	if err := s.db.Where("id = ? AND owner_id = ?", folderID, ownerID).First(&folder).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("folder not found or access denied")
		}
		return nil, err
	}

	var folderShares []models.FolderShare
	if err := s.db.Where("folder_id = ? AND deleted_at IS NULL", folderID).
		Preload("SharedWithUser").
		Find(&folderShares).Error; err != nil {
		return nil, err
	}

	return folderShares, nil
}

// GetFolderShareLinks returns all share links created by a user
func (s *FolderSharingService) GetFolderShareLinks(userID uuid.UUID) ([]models.FolderShareLink, error) {
	var shareLinks []models.FolderShareLink

	if err := s.db.Where("created_by = ? AND deleted_at IS NULL", userID).
		Preload("Folder").
		Find(&shareLinks).Error; err != nil {
		return nil, err
	}

	return shareLinks, nil
}

// RevokeFolderShare removes a folder share
func (s *FolderSharingService) RevokeFolderShare(shareID, userID uuid.UUID) error {
	// Find the share and verify ownership
	var folderShare models.FolderShare
	if err := s.db.Where("id = ? AND shared_by = ?", shareID, userID).First(&folderShare).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.New("folder share not found or access denied")
		}
		return err
	}

	// Soft delete the share
	return s.db.Model(&folderShare).Update("deleted_at", time.Now()).Error
}

// RevokeFolderShareLink deactivates a folder share link
func (s *FolderSharingService) RevokeFolderShareLink(linkID, userID uuid.UUID) error {
	// Find the share link and verify ownership
	var shareLink models.FolderShareLink
	if err := s.db.Where("id = ? AND created_by = ?", linkID, userID).First(&shareLink).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return errors.New("folder share link not found or access denied")
		}
		return err
	}

	// Soft delete the share link
	return s.db.Model(&shareLink).Update("deleted_at", time.Now()).Error
}

// AccessFolderByToken validates and returns folder access info from a share token
func (s *FolderSharingService) AccessFolderByToken(token string, password string) (*models.FolderShareLink, error) {
	var shareLink models.FolderShareLink

	if err := s.db.Where("token = ? AND is_active = true AND deleted_at IS NULL", token).
		Preload("Folder").
		Preload("CreatedByUser").
		First(&shareLink).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("invalid or expired share link")
		}
		return nil, err
	}

	// Check if link has expired
	if shareLink.ExpiresAt != nil && time.Now().After(*shareLink.ExpiresAt) {
		return nil, errors.New("share link has expired")
	}

	// Check password if required
	if shareLink.PasswordHash != "" {
		if password == "" {
			return nil, errors.New("password required")
		}
		if !checkPasswordHash(password, shareLink.PasswordHash) {
			return nil, errors.New("invalid password")
		}
	}

	// Check download limit
	if shareLink.MaxDownloads != nil && shareLink.DownloadCount >= *shareLink.MaxDownloads {
		return nil, errors.New("download limit exceeded")
	}

	return &shareLink, nil
}

// LogFolderShareLinkAccess logs access to a folder share link
func (s *FolderSharingService) LogFolderShareLinkAccess(linkID uuid.UUID, ipAddress, userAgent, action string) error {
	accessLog := models.FolderShareLinkAccessLog{
		FolderShareLinkID: linkID,
		IPAddress:         ipAddress,
		UserAgent:         userAgent,
		Action:            action,
		AccessedAt:        time.Now(),
	}

	return s.db.Create(&accessLog).Error
}

// Helper function to generate secure token (copied from file sharing service)
func generateSecureToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// Helper functions for password hashing (should be shared utility functions)
func hashPassword(password string) (string, error) {
	// This is a simple example - in production, use bcrypt
	return password, nil // TODO: Implement proper password hashing
}

func checkPasswordHash(password, hash string) bool {
	// This is a simple example - in production, use bcrypt
	return password == hash // TODO: Implement proper password checking
}
