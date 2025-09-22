package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AuditLogAction represents the type of action performed
type AuditLogAction string

const (
	AuditActionUpload   AuditLogAction = "upload"
	AuditActionDownload AuditLogAction = "download"
	AuditActionDelete   AuditLogAction = "delete"
	AuditActionShare    AuditLogAction = "share"
	AuditActionView     AuditLogAction = "view"
	AuditActionMove     AuditLogAction = "move"
	AuditActionRename   AuditLogAction = "rename"
	AuditActionCreate   AuditLogAction = "create"
	AuditActionUpdate   AuditLogAction = "update"
)

// AuditLogResourceType represents the type of resource
type AuditLogResourceType string

const (
	AuditResourceFile   AuditLogResourceType = "file"
	AuditResourceFolder AuditLogResourceType = "folder"
	AuditResourceShare  AuditLogResourceType = "share"
)

// AuditLogStatus represents the status of the action
type AuditLogStatus string

const (
	AuditStatusSuccess AuditLogStatus = "success"
	AuditStatusFailed  AuditLogStatus = "failed"
	AuditStatusPartial AuditLogStatus = "partial"
)

// AuditLogDetails holds additional metadata as JSON
type AuditLogDetails map[string]interface{}

// Value implements the driver.Valuer interface for JSON storage
func (d AuditLogDetails) Value() (driver.Value, error) {
	if d == nil {
		return nil, nil
	}
	return json.Marshal(d)
}

// Scan implements the sql.Scanner interface for JSON scanning
func (d *AuditLogDetails) Scan(value interface{}) error {
	if value == nil {
		*d = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}

	return json.Unmarshal(bytes, d)
}

// AuditLog represents an audit log entry
type AuditLog struct {
	ID           uuid.UUID            `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID       uuid.UUID            `json:"user_id" gorm:"type:uuid;not null;index"`
	Action       AuditLogAction       `json:"action" gorm:"type:varchar(50);not null;index"`
	ResourceType AuditLogResourceType `json:"resource_type" gorm:"type:varchar(20);not null;index"`
	ResourceID   *uuid.UUID           `json:"resource_id,omitempty" gorm:"type:uuid;index"`
	ResourceName *string              `json:"resource_name,omitempty" gorm:"type:varchar(255)"`
	Details      AuditLogDetails      `json:"details,omitempty" gorm:"type:jsonb"`
	IPAddress    *string              `json:"ip_address,omitempty" gorm:"type:inet"`
	UserAgent    *string              `json:"user_agent,omitempty" gorm:"type:text"`
	Status       AuditLogStatus       `json:"status" gorm:"type:varchar(20);default:'success'"`
	CreatedAt    time.Time            `json:"created_at" gorm:"index"`
	UpdatedAt    time.Time            `json:"updated_at"`

	// Associations
	User User `json:"user,omitempty" gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
}

// BeforeCreate hook
func (al *AuditLog) BeforeCreate(tx *gorm.DB) error {
	if al.ID == uuid.Nil {
		al.ID = uuid.New()
	}
	return nil
}

// TableName returns the table name for GORM
func (AuditLog) TableName() string {
	return "audit_logs"
}

// GetUserDisplayName returns the user's display name for the audit log
func (al *AuditLog) GetUserDisplayName() string {
	if al.User.Username != "" {
		return al.User.Username
	}
	if al.User.Email != "" {
		return al.User.Email
	}
	return "Unknown User"
}

// AuditLogFilter represents filters for querying audit logs
type AuditLogFilter struct {
	UserID       *uuid.UUID            `json:"user_id,omitempty"`
	Action       *AuditLogAction       `json:"action,omitempty"`
	ResourceType *AuditLogResourceType `json:"resource_type,omitempty"`
	ResourceID   *uuid.UUID            `json:"resource_id,omitempty"`
	Status       *AuditLogStatus       `json:"status,omitempty"`
	DateFrom     *time.Time            `json:"date_from,omitempty"`
	DateTo       *time.Time            `json:"date_to,omitempty"`
	Limit        int                   `json:"limit,omitempty"`
	Offset       int                   `json:"offset,omitempty"`
}

// PaginatedAuditLogs represents paginated audit log results
type PaginatedAuditLogs struct {
	Activities []AuditLog `json:"activities"`
	Total      int64      `json:"total"`
	HasMore    bool       `json:"has_more"`
	Page       int        `json:"page"`
	Limit      int        `json:"limit"`
}
