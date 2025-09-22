package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"file-vault-system/backend/internal/models"
	"file-vault-system/backend/internal/services"
)

// AuditHandler handles audit log related HTTP requests
type AuditHandler struct {
	auditService *services.AuditService
}

// NewAuditHandler creates a new audit handler
func NewAuditHandler(auditService *services.AuditService) *AuditHandler {
	return &AuditHandler{
		auditService: auditService,
	}
}

// GetAuditLogs handles GET /api/v1/audit-logs
func (h *AuditHandler) GetAuditLogs(c *gin.Context) {
	// Extract user ID from JWT claims
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	currentUserID := userID.(uuid.UUID)

	// Check if user is admin for viewing all logs
	userRole, _ := c.Get("user_role")
	isAdmin := userRole == "admin"

	// Build filter from query parameters
	filter := models.AuditLogFilter{}

	// Non-admin users can only see their own logs
	if !isAdmin {
		filter.UserID = &currentUserID
	} else {
		// Admin can optionally filter by user_id
		if userIDParam := c.Query("user_id"); userIDParam != "" {
			if uid, err := uuid.Parse(userIDParam); err == nil {
				filter.UserID = &uid
			}
		}
	}

	// Parse action filter
	if action := c.Query("action"); action != "" {
		auditAction := models.AuditLogAction(action)
		filter.Action = &auditAction
	}

	// Parse resource_type filter
	if resourceType := c.Query("resource_type"); resourceType != "" {
		auditResourceType := models.AuditLogResourceType(resourceType)
		filter.ResourceType = &auditResourceType
	}

	// Parse resource_id filter
	if resourceID := c.Query("resource_id"); resourceID != "" {
		if rid, err := uuid.Parse(resourceID); err == nil {
			filter.ResourceID = &rid
		}
	}

	// Parse status filter
	if status := c.Query("status"); status != "" {
		auditStatus := models.AuditLogStatus(status)
		filter.Status = &auditStatus
	}

	// Parse date filters
	if dateFrom := c.Query("date_from"); dateFrom != "" {
		if df, err := time.Parse("2006-01-02", dateFrom); err == nil {
			filter.DateFrom = &df
		}
	}

	if dateTo := c.Query("date_to"); dateTo != "" {
		if dt, err := time.Parse("2006-01-02", dateTo); err == nil {
			// Set to end of day
			endOfDay := dt.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			filter.DateTo = &endOfDay
		}
	}

	// Parse pagination parameters
	if limit := c.Query("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil && l > 0 {
			filter.Limit = l
		}
	}

	if page := c.Query("page"); page != "" {
		if p, err := strconv.Atoi(page); err == nil && p > 0 {
			filter.Offset = (p - 1) * filter.Limit
		}
	}

	// Set default limit if not provided
	if filter.Limit == 0 {
		filter.Limit = 50
	}

	// Get audit logs
	result, err := h.auditService.GetAuditLogs(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve audit logs"})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetUserActivitySummary handles GET /api/v1/audit-logs/summary
func (h *AuditHandler) GetUserActivitySummary(c *gin.Context) {
	// Extract user ID from JWT claims
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	currentUserID := userID.(uuid.UUID)

	// Check if user is admin and wants to see another user's summary
	userRole, _ := c.Get("user_role")
	isAdmin := userRole == "admin"

	targetUserID := currentUserID
	if isAdmin {
		if userIDParam := c.Query("user_id"); userIDParam != "" {
			if uid, err := uuid.Parse(userIDParam); err == nil {
				targetUserID = uid
			}
		}
	}

	// Parse days parameter
	days := 30 // Default to 30 days
	if daysParam := c.Query("days"); daysParam != "" {
		if d, err := strconv.Atoi(daysParam); err == nil && d > 0 && d <= 365 {
			days = d
		}
	}

	// Get activity summary
	summary, err := h.auditService.GetUserActivitySummary(c.Request.Context(), targetUserID, days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve activity summary"})
		return
	}

	c.JSON(http.StatusOK, summary)
}

// GetAdminAuditLogs handles GET /admin/audit-logs (admin only)
func (h *AuditHandler) GetAdminAuditLogs(c *gin.Context) {
	// Check admin role (this should be done in middleware)
	userRole, exists := c.Get("user_role")
	if !exists || userRole != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	// Build filter from query parameters (similar to GetAuditLogs but without user restrictions)
	filter := models.AuditLogFilter{}

	// Parse all filters
	if userIDParam := c.Query("user_id"); userIDParam != "" {
		if uid, err := uuid.Parse(userIDParam); err == nil {
			filter.UserID = &uid
		}
	}

	if action := c.Query("action"); action != "" {
		auditAction := models.AuditLogAction(action)
		filter.Action = &auditAction
	}

	if resourceType := c.Query("resource_type"); resourceType != "" {
		auditResourceType := models.AuditLogResourceType(resourceType)
		filter.ResourceType = &auditResourceType
	}

	if resourceID := c.Query("resource_id"); resourceID != "" {
		if rid, err := uuid.Parse(resourceID); err == nil {
			filter.ResourceID = &rid
		}
	}

	if status := c.Query("status"); status != "" {
		auditStatus := models.AuditLogStatus(status)
		filter.Status = &auditStatus
	}

	if dateFrom := c.Query("date_from"); dateFrom != "" {
		if df, err := time.Parse("2006-01-02", dateFrom); err == nil {
			filter.DateFrom = &df
		}
	}

	if dateTo := c.Query("date_to"); dateTo != "" {
		if dt, err := time.Parse("2006-01-02", dateTo); err == nil {
			endOfDay := dt.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			filter.DateTo = &endOfDay
		}
	}

	// Parse pagination
	if limit := c.Query("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil && l > 0 && l <= 1000 {
			filter.Limit = l
		}
	}

	if page := c.Query("page"); page != "" {
		if p, err := strconv.Atoi(page); err == nil && p > 0 {
			filter.Offset = (p - 1) * filter.Limit
		}
	}

	// Set default limit
	if filter.Limit == 0 {
		filter.Limit = 100
	}

	// Get audit logs
	result, err := h.auditService.GetAuditLogs(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve audit logs"})
		return
	}

	c.JSON(http.StatusOK, result)
}

// DeleteOldAuditLogs handles DELETE /admin/audit-logs/cleanup (admin only)
func (h *AuditHandler) DeleteOldAuditLogs(c *gin.Context) {
	// Check admin role
	userRole, exists := c.Get("user_role")
	if !exists || userRole != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return
	}

	// Parse days parameter
	days := 365 // Default to 1 year
	if daysParam := c.Query("older_than_days"); daysParam != "" {
		if d, err := strconv.Atoi(daysParam); err == nil && d > 30 { // Minimum 30 days
			days = d
		}
	}

	// Delete old audit logs
	deletedCount, err := h.auditService.DeleteOldAuditLogs(c.Request.Context(), days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete old audit logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":         "Old audit logs deleted successfully",
		"deleted_count":   deletedCount,
		"older_than_days": days,
	})
}
