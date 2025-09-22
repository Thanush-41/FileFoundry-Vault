package middleware

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"file-vault-system/backend/internal/config"
	"file-vault-system/backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/time/rate"
	"gorm.io/gorm"
)

// RateLimiter stores rate limiters for different users and endpoints
type RateLimiter struct {
	limiters map[string]*rate.Limiter
	mu       sync.RWMutex
	rate     rate.Limit
	burst    int
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(r rate.Limit, b int) *RateLimiter {
	return &RateLimiter{
		limiters: make(map[string]*rate.Limiter),
		rate:     r,
		burst:    b,
	}
}

// GetLimiter returns a rate limiter for a specific key
func (rl *RateLimiter) GetLimiter(key string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	limiter, exists := rl.limiters[key]
	if !exists {
		limiter = rate.NewLimiter(rl.rate, rl.burst)
		rl.limiters[key] = limiter
	}

	return limiter
}

// CleanupOldLimiters removes unused limiters to prevent memory leaks
func (rl *RateLimiter) CleanupOldLimiters() {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	for key, limiter := range rl.limiters {
		// Remove limiters that haven't been used in the last hour
		if limiter.Tokens() == float64(rl.burst) {
			delete(rl.limiters, key)
		}
	}
}

// Global rate limiter instance (will be configured later)
var globalRateLimiter *RateLimiter

// InitializeRateLimiter initializes the global rate limiter with config
func InitializeRateLimiter(cfg *config.Config) {
	globalRateLimiter = NewRateLimiter(rate.Limit(cfg.RateLimit), cfg.RateLimitBurst)

	// Start cleanup routine
	go func() {
		ticker := time.NewTicker(time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			globalRateLimiter.CleanupOldLimiters()
		}
	}()
}

// RateLimit middleware implements rate limiting per user with configurable limits
func RateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip rate limiting for health check, public file access, file listing operations, auth endpoints, and admin endpoints
		if c.Request.URL.Path == "/health" ||
			(len(c.Request.URL.Path) > 12 && c.Request.URL.Path[:13] == "/public-files") ||
			// Skip rate limiting for GET requests to file listing endpoints
			(c.Request.Method == "GET" && (c.Request.URL.Path == "/api/v1/files" || c.Request.URL.Path == "/api/v1/files/")) ||
			// Skip rate limiting for folder listing endpoints
			(c.Request.Method == "GET" && (c.Request.URL.Path == "/api/v1/folders" || c.Request.URL.Path == "/api/v1/folders/")) ||
			// Skip rate limiting for auth endpoints (login, register, logout)
			(len(c.Request.URL.Path) > 12 && c.Request.URL.Path[:13] == "/api/v1/auth/") ||
			// Skip rate limiting for admin endpoints
			(len(c.Request.URL.Path) > 13 && c.Request.URL.Path[:14] == "/api/v1/admin/") {
			c.Next()
			return
		}

		// Ensure rate limiter is initialized
		if globalRateLimiter == nil {
			c.Next()
			return
		}

		// Get user ID from context (if authenticated)
		var userKey string
		if uid, exists := c.Get("user_id"); exists {
			if id, ok := uid.(uuid.UUID); ok {
				userKey = fmt.Sprintf("user:%s", id.String())
			}
		}

		// Use IP address if no user ID available
		if userKey == "" {
			userKey = fmt.Sprintf("ip:%s", c.ClientIP())
		}

		// Create a unique key for this user
		key := userKey

		// Get rate limiter for this key
		limiter := globalRateLimiter.GetLimiter(key)

		// Check if request is allowed
		if !limiter.Allow() {
			// Calculate retry after time
			reservation := limiter.Reserve()
			retryAfter := int(reservation.Delay().Seconds()) + 1
			reservation.Cancel() // Cancel the reservation since we're rejecting

			c.Header("X-RateLimit-Limit", fmt.Sprintf("%v", globalRateLimiter.rate))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", time.Now().Add(time.Duration(retryAfter)*time.Second).Unix()))
			c.Header("Retry-After", fmt.Sprintf("%d", retryAfter))

			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "Rate limit exceeded",
				"type":        "RATE_LIMIT_EXCEEDED",
				"message":     fmt.Sprintf("Too many requests. You have exceeded the limit of %.0f calls per %d second(s). Please try again later.", float64(globalRateLimiter.rate), 1),
				"retry_after": retryAfter,
				"limit":       float64(globalRateLimiter.rate),
				"window":      1,
				"code":        "RATE_LIMIT_ERROR",
			})
			c.Abort()
			return
		}

		// Add rate limit headers for successful requests
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%v", globalRateLimiter.rate))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%.0f", limiter.Tokens()))

		c.Next()
	}
}

// DatabaseRateLimit middleware uses database to track rate limits with configurable settings
func DatabaseRateLimit(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip rate limiting for health check, public file access, file listing operations, auth endpoints, and admin endpoints
		if c.Request.URL.Path == "/health" ||
			(len(c.Request.URL.Path) > 12 && c.Request.URL.Path[:13] == "/public-files") ||
			// Skip rate limiting for GET requests to file listing endpoints
			(c.Request.Method == "GET" && (c.Request.URL.Path == "/api/v1/files" || c.Request.URL.Path == "/api/v1/files/")) ||
			// Skip rate limiting for folder listing endpoints
			(c.Request.Method == "GET" && (c.Request.URL.Path == "/api/v1/folders" || c.Request.URL.Path == "/api/v1/folders/")) ||
			// Skip rate limiting for auth endpoints (login, register, logout)
			(len(c.Request.URL.Path) > 12 && c.Request.URL.Path[:13] == "/api/v1/auth/") ||
			// Skip rate limiting for admin endpoints
			(len(c.Request.URL.Path) > 13 && c.Request.URL.Path[:14] == "/api/v1/admin/") {
			c.Next()
			return
		}

		// Get user ID from context
		userIDInterface, exists := c.Get("user_id")
		if !exists {
			// For unauthenticated requests, use the in-memory rate limiter
			c.Next()
			return
		}

		userID, ok := userIDInterface.(uuid.UUID)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Invalid user ID",
				"type":  "server_error",
			})
			c.Abort()
			return
		}

		endpoint := c.Request.URL.Path
		now := time.Now()
		windowDuration := time.Duration(cfg.RateLimitWindow) * time.Second
		maxRequests := cfg.RateLimit

		// Check current rate limit status
		var rateLimit models.APIRateLimit
		result := db.Where("user_id = ? AND endpoint = ?", userID, endpoint).First(&rateLimit)

		if result.Error == gorm.ErrRecordNotFound {
			// Create new rate limit record
			rateLimit = models.APIRateLimit{
				UserID:         userID,
				Endpoint:       endpoint,
				RequestCount:   1,
				WindowStart:    now,
				WindowDuration: windowDuration,
				MaxRequests:    maxRequests,
			}
			db.Create(&rateLimit)
			c.Next()
			return
		} else if result.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Database error during rate limit check",
				"type":    "SERVER_ERROR",
				"message": "Unable to verify rate limit status. Please try again",
				"code":    "DATABASE_ERROR",
			})
			c.Abort()
			return
		}

		// Check if window has expired
		windowEnd := rateLimit.WindowStart.Add(rateLimit.WindowDuration)
		if now.After(windowEnd) {
			// Reset the window
			rateLimit.RequestCount = 1
			rateLimit.WindowStart = now
			rateLimit.MaxRequests = maxRequests // Update in case config changed
			rateLimit.WindowDuration = windowDuration
			db.Save(&rateLimit)
			c.Next()
			return
		}

		// Check if limit exceeded
		if rateLimit.RequestCount >= rateLimit.MaxRequests {
			retryAfter := int(windowEnd.Sub(now).Seconds()) + 1

			c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", rateLimit.MaxRequests))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", windowEnd.Unix()))
			c.Header("Retry-After", fmt.Sprintf("%d", retryAfter))

			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "Rate limit exceeded",
				"type":        "RATE_LIMIT_EXCEEDED",
				"message":     fmt.Sprintf("You have exceeded the limit of %d requests per %v for this endpoint. Please wait before trying again.", rateLimit.MaxRequests, rateLimit.WindowDuration),
				"retry_after": retryAfter,
				"limit":       rateLimit.MaxRequests,
				"window":      rateLimit.WindowDuration.String(),
				"endpoint":    endpoint,
				"code":        "RATE_LIMIT_ERROR",
			})
			c.Abort()
			return
		}

		// Increment request count
		rateLimit.RequestCount++
		db.Save(&rateLimit)

		// Add rate limit headers
		remaining := rateLimit.MaxRequests - rateLimit.RequestCount
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", rateLimit.MaxRequests))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
		c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", windowEnd.Unix()))

		c.Next()
	}
}

// StorageQuotaMiddleware checks if user has exceeded storage quota with detailed validation
func StorageQuotaMiddleware(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Only check for file upload endpoints
		if c.Request.Method != "POST" || !contains(c.Request.URL.Path, []string{"/upload", "/files"}) {
			c.Next()
			return
		}

		userIDInterface, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Authentication required",
				"type":    "AUTHENTICATION_REQUIRED",
				"message": "You must be logged in to upload files",
				"code":    "AUTH_REQUIRED",
			})
			c.Abort()
			return
		}

		userID, ok := userIDInterface.(uuid.UUID)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Invalid user session",
				"type":    "SERVER_ERROR",
				"message": "Your session appears to be corrupted. Please log in again",
				"code":    "INVALID_SESSION",
			})
			c.Abort()
			return
		}

		// Get user's current storage usage and quota
		var user models.User
		if err := db.First(&user, userID).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "User account not found",
				"type":    "SERVER_ERROR",
				"message": "Your user account could not be found. Please contact support",
				"code":    "USER_NOT_FOUND",
			})
			c.Abort()
			return
		}

		// Calculate remaining quota
		remainingQuota := user.StorageQuota - user.StorageUsed
		if remainingQuota <= 0 {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Storage quota exceeded",
				"type":    "STORAGE_QUOTA_EXCEEDED",
				"message": fmt.Sprintf("Your storage quota of %.2f MB is fully used. Please delete some files to free up space or contact support to increase your quota.", float64(user.StorageQuota)/(1024*1024)),
				"quota_info": gin.H{
					"total_quota":       user.StorageQuota,
					"used_storage":      user.StorageUsed,
					"available_storage": 0,
					"quota_mb":          float64(user.StorageQuota) / (1024 * 1024),
					"used_mb":           float64(user.StorageUsed) / (1024 * 1024),
					"available_mb":      0.0,
				},
				"code": "QUOTA_EXCEEDED",
			})
			c.Abort()
			return
		}

		// Check if the upload size would exceed quota
		contentLength := c.Request.ContentLength
		if contentLength > 0 && contentLength > remainingQuota {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Storage quota exceeded",
				"type":  "STORAGE_QUOTA_EXCEEDED",
				"message": fmt.Sprintf("Upload would exceed your storage quota of %.2f MB. Used: %.2f MB, Available: %.2f MB, File size: %.2f MB",
					float64(user.StorageQuota)/(1024*1024),
					float64(user.StorageUsed)/(1024*1024),
					float64(remainingQuota)/(1024*1024),
					float64(contentLength)/(1024*1024)),
				"quota_info": gin.H{
					"total_quota":       user.StorageQuota,
					"used_storage":      user.StorageUsed,
					"available_storage": remainingQuota,
					"file_size":         contentLength,
					"quota_mb":          float64(user.StorageQuota) / (1024 * 1024),
					"used_mb":           float64(user.StorageUsed) / (1024 * 1024),
					"available_mb":      float64(remainingQuota) / (1024 * 1024),
					"file_mb":           float64(contentLength) / (1024 * 1024),
				},
				"code": "UPLOAD_EXCEEDS_QUOTA",
			})
			c.Abort()
			return
		}

		// Check against max file size limit
		if contentLength > cfg.MaxFileSize {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{
				"error": "File too large",
				"type":  "FILE_SIZE_EXCEEDED",
				"message": fmt.Sprintf("File size %.2f MB exceeds the maximum allowed size of %.2f MB",
					float64(contentLength)/(1024*1024),
					float64(cfg.MaxFileSize)/(1024*1024)),
				"max_size":     cfg.MaxFileSize,
				"file_size":    contentLength,
				"max_size_mb":  float64(cfg.MaxFileSize) / (1024 * 1024),
				"file_size_mb": float64(contentLength) / (1024 * 1024),
				"code":         "FILE_TOO_LARGE",
			})
			c.Abort()
			return
		}

		// Set quota information in context for upload handlers
		c.Set("remaining_quota", remainingQuota)
		c.Set("user_quota", user.StorageQuota)
		c.Set("used_quota", user.StorageUsed)

		c.Next()
	}
}

// AdminOnlyMiddleware restricts access to admin users only
func AdminOnlyMiddleware() gin.HandlerFunc {
	return RequireAdmin()
}

// FileUploadSizeLimit middleware checks file size before processing with configurable limits
func FileUploadSizeLimit(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == "POST" && c.Request.Header.Get("Content-Type") != "" {
			contentLength := c.Request.ContentLength
			if contentLength > cfg.MaxFileSize {
				c.JSON(http.StatusRequestEntityTooLarge, gin.H{
					"error": "File too large",
					"type":  "FILE_SIZE_EXCEEDED",
					"message": fmt.Sprintf("File size %.2f MB exceeds the maximum allowed size of %.2f MB",
						float64(contentLength)/(1024*1024),
						float64(cfg.MaxFileSize)/(1024*1024)),
					"max_size":     cfg.MaxFileSize,
					"file_size":    contentLength,
					"max_size_mb":  float64(cfg.MaxFileSize) / (1024 * 1024),
					"file_size_mb": float64(contentLength) / (1024 * 1024),
					"code":         "FILE_TOO_LARGE",
				})
				c.Abort()
				return
			}
		}
		c.Next()
	}
}

// QuotaInfoMiddleware adds quota information to responses for authenticated users
func QuotaInfoMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Process the request first
		c.Next()

		// Add quota info to response headers for authenticated users
		if userIDInterface, exists := c.Get("user_id"); exists {
			if userID, ok := userIDInterface.(uuid.UUID); ok {
				var user models.User
				if err := db.First(&user, userID).Error; err == nil {
					remaining := user.StorageQuota - user.StorageUsed
					c.Header("X-Storage-Quota", fmt.Sprintf("%d", user.StorageQuota))
					c.Header("X-Storage-Used", fmt.Sprintf("%d", user.StorageUsed))
					c.Header("X-Storage-Remaining", fmt.Sprintf("%d", remaining))
					c.Header("X-Storage-Usage-Percent", fmt.Sprintf("%.1f", float64(user.StorageUsed)/float64(user.StorageQuota)*100))
				}
			}
		}
	}
}

// contains checks if a string contains any of the provided substrings
func contains(s string, substrings []string) bool {
	for _, substring := range substrings {
		if len(s) >= len(substring) {
			for i := 0; i <= len(s)-len(substring); i++ {
				if s[i:i+len(substring)] == substring {
					return true
				}
			}
		}
	}
	return false
}
