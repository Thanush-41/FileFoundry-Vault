package handlers

import (
	"net/http"
	"strconv"
	"time"

	"file-vault-system/backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Use models package
type User = models.User
type File = models.File
type DownloadStat = models.DownloadStat

type AnalyticsData struct {
	// User Analytics
	TotalUsers       int64 `json:"totalUsers"`
	ActiveUsers      int64 `json:"activeUsers"`
	NewUsersToday    int64 `json:"newUsersToday"`
	NewUsersThisWeek int64 `json:"newUsersThisWeek"`

	// File Analytics
	TotalFiles          int64   `json:"totalFiles"`
	TotalStorage        int64   `json:"totalStorage"`
	FilesUploadedToday  int64   `json:"filesUploadedToday"`
	StorageUsagePercent float64 `json:"storageUsagePercent"`

	// Download Analytics
	TotalDownloads    int64 `json:"totalDownloads"`
	DownloadsToday    int64 `json:"downloadsToday"`
	DownloadsThisWeek int64 `json:"downloadsThisWeek"`
	UniqueDownloaders int64 `json:"uniqueDownloaders"`

	// Activity Analytics
	ActiveSessions int64 `json:"activeSessions"`
}

type TimeSeriesData struct {
	Date  string `json:"date"`
	Value int64  `json:"value"`
}

type FileTypeDistribution struct {
	Type  string `json:"type"`
	Count int64  `json:"count"`
	Size  int64  `json:"size"`
}

type TopFile struct {
	ID               string `json:"id"`
	OriginalFilename string `json:"originalFilename"`
	DownloadCount    int64  `json:"downloadCount"`
	Owner            string `json:"owner"`
	Size             int64  `json:"size"`
}

type UserActivityData struct {
	Username      string     `json:"username"`
	FilesUploaded int64      `json:"filesUploaded"`
	StorageUsed   int64      `json:"storageUsed"`
	LastLogin     *time.Time `json:"lastLogin"`
	IsActive      bool       `json:"isActive"`
}

func GetAnalyticsOverview(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	var analytics AnalyticsData

	// User analytics
	db.Model(&User{}).Count(&analytics.TotalUsers)
	db.Model(&User{}).Where("is_active = ?", true).Count(&analytics.ActiveUsers)

	// New users today
	today := time.Now().Truncate(24 * time.Hour)
	db.Model(&User{}).Where("created_at >= ?", today).Count(&analytics.NewUsersToday)

	// New users this week
	weekStart := time.Now().AddDate(0, 0, -7).Truncate(24 * time.Hour)
	db.Model(&User{}).Where("created_at >= ?", weekStart).Count(&analytics.NewUsersThisWeek)

	// File analytics
	db.Model(&File{}).Count(&analytics.TotalFiles)

	// Total storage used
	var totalStorage struct {
		Total int64
	}
	db.Model(&File{}).Select("SUM(size) as total").Scan(&totalStorage)
	analytics.TotalStorage = totalStorage.Total

	// Files uploaded today
	db.Model(&File{}).Where("created_at >= ?", today).Count(&analytics.FilesUploadedToday)

	// Storage usage percentage (assuming 100GB total capacity)
	const totalCapacity = 100 * 1024 * 1024 * 1024 // 100GB in bytes
	analytics.StorageUsagePercent = float64(analytics.TotalStorage) / float64(totalCapacity) * 100

	// Download analytics
	var downloadStats struct {
		TotalDownloads    int64
		DownloadsToday    int64
		DownloadsThisWeek int64
	}

	db.Model(&DownloadStat{}).Count(&downloadStats.TotalDownloads)
	db.Model(&DownloadStat{}).Where("downloaded_at >= ?", today).Count(&downloadStats.DownloadsToday)
	db.Model(&DownloadStat{}).Where("downloaded_at >= ?", weekStart).Count(&downloadStats.DownloadsThisWeek)

	analytics.TotalDownloads = downloadStats.TotalDownloads
	analytics.DownloadsToday = downloadStats.DownloadsToday
	analytics.DownloadsThisWeek = downloadStats.DownloadsThisWeek

	// Unique downloaders
	db.Model(&DownloadStat{}).Distinct("downloaded_by").Count(&analytics.UniqueDownloaders)

	// Active sessions (users who logged in within last hour)
	lastHour := time.Now().Add(-1 * time.Hour)
	db.Model(&User{}).Where("updated_at >= ? AND is_active = ?", lastHour, true).Count(&analytics.ActiveSessions)

	c.JSON(http.StatusOK, analytics)
}

func GetUserRegistrationTrend(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	days := 30
	if d := c.Query("days"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil && parsed > 0 {
			days = parsed
		}
	}

	var trends []TimeSeriesData

	for i := days - 1; i >= 0; i-- {
		date := time.Now().AddDate(0, 0, -i).Truncate(24 * time.Hour)
		nextDate := date.Add(24 * time.Hour)

		var count int64
		db.Model(&User{}).Where("created_at >= ? AND created_at < ?", date, nextDate).Count(&count)

		trends = append(trends, TimeSeriesData{
			Date:  date.Format("2006-01-02"),
			Value: count,
		})
	}

	c.JSON(http.StatusOK, trends)
}

func GetFileUploadTrend(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	days := 30
	if d := c.Query("days"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil && parsed > 0 {
			days = parsed
		}
	}

	var trends []TimeSeriesData

	for i := days - 1; i >= 0; i-- {
		date := time.Now().AddDate(0, 0, -i).Truncate(24 * time.Hour)
		nextDate := date.Add(24 * time.Hour)

		var count int64
		db.Model(&File{}).Where("created_at >= ? AND created_at < ?", date, nextDate).Count(&count)

		trends = append(trends, TimeSeriesData{
			Date:  date.Format("2006-01-02"),
			Value: count,
		})
	}

	c.JSON(http.StatusOK, trends)
}

func GetDownloadTrend(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	days := 30
	if d := c.Query("days"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil && parsed > 0 {
			days = parsed
		}
	}

	var trends []TimeSeriesData

	for i := days - 1; i >= 0; i-- {
		date := time.Now().AddDate(0, 0, -i).Truncate(24 * time.Hour)
		nextDate := date.Add(24 * time.Hour)

		var count int64
		db.Model(&DownloadStat{}).Where("downloaded_at >= ? AND downloaded_at < ?", date, nextDate).Count(&count)

		trends = append(trends, TimeSeriesData{
			Date:  date.Format("2006-01-02"),
			Value: count,
		})
	}

	c.JSON(http.StatusOK, trends)
}

func GetFileTypeDistribution(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	var distributions []FileTypeDistribution

	rows, err := db.Model(&File{}).
		Select("SUBSTRING(mime_type FROM 1 FOR POSITION('/' IN mime_type) - 1) as type, COUNT(*) as count, SUM(size) as size").
		Group("SUBSTRING(mime_type FROM 1 FOR POSITION('/' IN mime_type) - 1)").
		Order("count DESC").
		Rows()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get file type distribution"})
		return
	}
	defer rows.Close()

	for rows.Next() {
		var dist FileTypeDistribution
		if err := rows.Scan(&dist.Type, &dist.Count, &dist.Size); err != nil {
			continue
		}
		if dist.Type == "" {
			dist.Type = "other"
		}
		distributions = append(distributions, dist)
	}

	c.JSON(http.StatusOK, distributions)
}

func GetTopFiles(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	limit := 10
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	var topFiles []TopFile

	err := db.Model(&File{}).
		Select("files.id, files.original_filename, COALESCE(COUNT(download_stats.id), 0) as download_count, files.size, users.username as owner").
		Joins("LEFT JOIN users ON files.owner_id = users.id").
		Joins("LEFT JOIN download_stats ON files.id = download_stats.file_id").
		Group("files.id, files.original_filename, files.size, users.username").
		Order("download_count DESC").
		Limit(limit).
		Scan(&topFiles).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get top files"})
		return
	}

	c.JSON(http.StatusOK, topFiles)
}

func GetUserActivity(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	var activities []UserActivityData

	err := db.Model(&User{}).
		Select(`
			users.username,
			COUNT(files.id) as files_uploaded,
			COALESCE(SUM(files.size), 0) as storage_used,
			users.updated_at as last_login,
			users.is_active
		`).
		Joins("LEFT JOIN files ON users.id = files.owner_id").
		Group("users.id, users.username, users.updated_at, users.is_active").
		Order("files_uploaded DESC").
		Scan(&activities).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user activity"})
		return
	}

	c.JSON(http.StatusOK, activities)
}

func GetStorageUsageTrend(c *gin.Context) {
	db := c.MustGet("db").(*gorm.DB)

	days := 30
	if d := c.Query("days"); d != "" {
		if parsed, err := strconv.Atoi(d); err == nil && parsed > 0 {
			days = parsed
		}
	}

	var trends []TimeSeriesData

	for i := days - 1; i >= 0; i-- {
		date := time.Now().AddDate(0, 0, -i).Truncate(24 * time.Hour)
		nextDate := date.Add(24 * time.Hour)

		var totalSize struct {
			Total int64
		}
		db.Model(&File{}).
			Select("COALESCE(SUM(size), 0) as total").
			Where("created_at < ?", nextDate).
			Scan(&totalSize)

		trends = append(trends, TimeSeriesData{
			Date:  date.Format("2006-01-02"),
			Value: totalSize.Total,
		})
	}

	c.JSON(http.StatusOK, trends)
}
