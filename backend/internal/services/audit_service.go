package services

import (
	"context"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"file-vault-system/backend/internal/models"
)

// AuditService handles audit logging operations
type AuditService struct {
	db *gorm.DB
}

// NewAuditService creates a new audit service
func NewAuditService(db *gorm.DB) *AuditService {
	return &AuditService{db: db}
}

// LogActivity logs an audit activity
func (s *AuditService) LogActivity(ctx context.Context, params LogActivityParams) error {
	auditLog := &models.AuditLog{
		UserID:       params.UserID,
		Action:       params.Action,
		ResourceType: params.ResourceType,
		ResourceID:   params.ResourceID,
		ResourceName: params.ResourceName,
		Details:      params.Details,
		IPAddress:    params.IPAddress,
		UserAgent:    params.UserAgent,
		Status:       params.Status,
	}

	if auditLog.Status == "" {
		auditLog.Status = models.AuditStatusSuccess
	}

	return s.db.WithContext(ctx).Create(auditLog).Error
}

// LogActivityFromGin logs an audit activity from a Gin context
func (s *AuditService) LogActivityFromGin(c *gin.Context, params LogActivityParams) error {
	// Extract IP address and user agent from Gin context
	if params.IPAddress == nil {
		ip := c.ClientIP()
		if ip != "" {
			params.IPAddress = &ip
		}
	}

	if params.UserAgent == nil {
		userAgent := c.GetHeader("User-Agent")
		if userAgent != "" {
			params.UserAgent = &userAgent
		}
	}

	return s.LogActivity(c.Request.Context(), params)
}

// GetAuditLogs retrieves audit logs with filtering and pagination
func (s *AuditService) GetAuditLogs(ctx context.Context, filter models.AuditLogFilter) (*models.PaginatedAuditLogs, error) {
	var logs []models.AuditLog
	var total int64

	// Build query
	query := s.db.WithContext(ctx).Model(&models.AuditLog{}).Preload("User")

	// Apply filters
	if filter.UserID != nil {
		query = query.Where("user_id = ?", *filter.UserID)
	}

	if filter.Action != nil {
		query = query.Where("action = ?", *filter.Action)
	}

	if filter.ResourceType != nil {
		query = query.Where("resource_type = ?", *filter.ResourceType)
	}

	if filter.ResourceID != nil {
		query = query.Where("resource_id = ?", *filter.ResourceID)
	}

	if filter.Status != nil {
		query = query.Where("status = ?", *filter.Status)
	}

	if filter.DateFrom != nil {
		query = query.Where("created_at >= ?", *filter.DateFrom)
	}

	if filter.DateTo != nil {
		query = query.Where("created_at <= ?", *filter.DateTo)
	}

	// Get total count
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	// Apply pagination
	limit := filter.Limit
	if limit <= 0 || limit > 100 {
		limit = 50 // Default limit
	}

	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}

	// Get paginated results
	if err := query.Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&logs).Error; err != nil {
		return nil, err
	}

	hasMore := int64(offset+limit) < total
	page := (offset / limit) + 1

	return &models.PaginatedAuditLogs{
		Activities: logs,
		Total:      total,
		HasMore:    hasMore,
		Page:       page,
		Limit:      limit,
	}, nil
}

// GetUserActivitySummary returns activity summary for a specific user
func (s *AuditService) GetUserActivitySummary(ctx context.Context, userID uuid.UUID, days int) (*UserActivitySummary, error) {
	if days <= 0 {
		days = 30 // Default to 30 days
	}

	since := time.Now().AddDate(0, 0, -days)

	var summary UserActivitySummary

	// Get total activities
	if err := s.db.WithContext(ctx).Model(&models.AuditLog{}).
		Where("user_id = ? AND created_at >= ?", userID, since).
		Count(&summary.TotalActivities).Error; err != nil {
		return nil, err
	}

	// Get activity breakdown by action
	type ActionCount struct {
		Action string `json:"action"`
		Count  int64  `json:"count"`
	}

	var actionCounts []ActionCount
	if err := s.db.WithContext(ctx).Model(&models.AuditLog{}).
		Select("action, COUNT(*) as count").
		Where("user_id = ? AND created_at >= ?", userID, since).
		Group("action").
		Scan(&actionCounts).Error; err != nil {
		return nil, err
	}

	summary.ActionBreakdown = make(map[string]int64)
	for _, ac := range actionCounts {
		summary.ActionBreakdown[ac.Action] = ac.Count
	}

	// Get recent activities
	var recentLogs []models.AuditLog
	if err := s.db.WithContext(ctx).Model(&models.AuditLog{}).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(10).
		Find(&recentLogs).Error; err != nil {
		return nil, err
	}

	summary.RecentActivities = recentLogs
	summary.Days = days

	return &summary, nil
}

// DeleteOldAuditLogs removes audit logs older than specified days
func (s *AuditService) DeleteOldAuditLogs(ctx context.Context, olderThanDays int) (int64, error) {
	if olderThanDays <= 0 {
		return 0, nil // Safety check
	}

	cutoffDate := time.Now().AddDate(0, 0, -olderThanDays)

	result := s.db.WithContext(ctx).
		Where("created_at < ?", cutoffDate).
		Delete(&models.AuditLog{})

	return result.RowsAffected, result.Error
}

// LogActivityParams represents parameters for logging an activity
type LogActivityParams struct {
	UserID       uuid.UUID                   `json:"user_id"`
	Action       models.AuditLogAction       `json:"action"`
	ResourceType models.AuditLogResourceType `json:"resource_type"`
	ResourceID   *uuid.UUID                  `json:"resource_id,omitempty"`
	ResourceName *string                     `json:"resource_name,omitempty"`
	Details      models.AuditLogDetails      `json:"details,omitempty"`
	IPAddress    *string                     `json:"ip_address,omitempty"`
	UserAgent    *string                     `json:"user_agent,omitempty"`
	Status       models.AuditLogStatus       `json:"status,omitempty"`
}

// UserActivitySummary represents a user's activity summary
type UserActivitySummary struct {
	TotalActivities  int64             `json:"total_activities"`
	ActionBreakdown  map[string]int64  `json:"action_breakdown"`
	RecentActivities []models.AuditLog `json:"recent_activities"`
	Days             int               `json:"days"`
}

// Helper functions for common audit actions

// LogFileUpload logs a file upload activity
func (s *AuditService) LogFileUpload(c *gin.Context, userID, fileID uuid.UUID, filename string, fileSize int64) error {
	details := models.AuditLogDetails{
		"file_size": fileSize,
		"timestamp": time.Now().Unix(),
	}

	return s.LogActivityFromGin(c, LogActivityParams{
		UserID:       userID,
		Action:       models.AuditActionUpload,
		ResourceType: models.AuditResourceFile,
		ResourceID:   &fileID,
		ResourceName: &filename,
		Details:      details,
		Status:       models.AuditStatusSuccess,
	})
}

// LogFileDownload logs a file download activity
func (s *AuditService) LogFileDownload(c *gin.Context, userID, fileID uuid.UUID, filename string, fileSize int64) error {
	details := models.AuditLogDetails{
		"file_size": fileSize,
		"timestamp": time.Now().Unix(),
	}

	return s.LogActivityFromGin(c, LogActivityParams{
		UserID:       userID,
		Action:       models.AuditActionDownload,
		ResourceType: models.AuditResourceFile,
		ResourceID:   &fileID,
		ResourceName: &filename,
		Details:      details,
		Status:       models.AuditStatusSuccess,
	})
}

// LogFileDelete logs a file deletion activity
func (s *AuditService) LogFileDelete(c *gin.Context, userID, fileID uuid.UUID, filename string) error {
	details := models.AuditLogDetails{
		"timestamp": time.Now().Unix(),
	}

	return s.LogActivityFromGin(c, LogActivityParams{
		UserID:       userID,
		Action:       models.AuditActionDelete,
		ResourceType: models.AuditResourceFile,
		ResourceID:   &fileID,
		ResourceName: &filename,
		Details:      details,
		Status:       models.AuditStatusSuccess,
	})
}

// LogFileShare logs a file sharing activity
func (s *AuditService) LogFileShare(c *gin.Context, userID, fileID uuid.UUID, filename string, shareWith []uuid.UUID) error {
	details := models.AuditLogDetails{
		"shared_with_count": len(shareWith),
		"shared_with_users": shareWith,
		"timestamp":         time.Now().Unix(),
	}

	return s.LogActivityFromGin(c, LogActivityParams{
		UserID:       userID,
		Action:       models.AuditActionShare,
		ResourceType: models.AuditResourceFile,
		ResourceID:   &fileID,
		ResourceName: &filename,
		Details:      details,
		Status:       models.AuditStatusSuccess,
	})
}
