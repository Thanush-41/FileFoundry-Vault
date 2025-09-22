package config

import (
	"os"
	"strconv"
	"strings"
)

// Config holds all configuration for the application
type Config struct {
	// Server configuration
	Environment  string
	Port         string
	ReadTimeout  int
	WriteTimeout int
	IdleTimeout  int

	// Database configuration
	DatabaseURL      string
	DatabaseHost     string
	DatabasePort     string
	DatabaseUser     string
	DatabasePassword string
	DatabaseName     string
	DatabaseSSLMode  string

	// JWT configuration
	JWTSecret     string
	JWTExpiration int // in hours

	// Rate limiting configuration
	RateLimit       int    // requests per second (default: 2)
	RateLimitWindow int    // window in seconds (default: 1)
	RateLimitBurst  int    // burst capacity (default: 5)
	EnableRateLimit bool   // enable/disable rate limiting
	RateLimitMode   string // "memory" or "database"

	// Storage configuration
	StoragePath      string
	AllowedMimeTypes []string

	// Storage quota configuration
	DefaultUserQuota int64 // default quota for new users in bytes
	MaxFileSize      int64 // maximum individual file size in bytes
	AdminQuota       int64 // default quota for admin users in bytes
	EnableQuotaCheck bool  // enable/disable quota enforcement

	// CORS configuration
	AllowedOrigins []string
	AllowedMethods []string
	AllowedHeaders []string

	// File serving
	MaxDownloadSize int64 // in bytes
	DownloadTimeout int   // in seconds
}

// Load loads configuration from environment variables with defaults
func Load() *Config {
	return &Config{
		// Server configuration
		Environment:  getEnv("ENVIRONMENT", "development"),
		Port:         getEnv("PORT", "8080"),
		ReadTimeout:  getEnvAsInt("READ_TIMEOUT", 10),
		WriteTimeout: getEnvAsInt("WRITE_TIMEOUT", 10),
		IdleTimeout:  getEnvAsInt("IDLE_TIMEOUT", 120),

		// Database configuration
		DatabaseURL:      getEnv("DATABASE_URL", ""),
		DatabaseHost:     getEnv("DB_HOST", "localhost"),
		DatabasePort:     getEnv("DB_PORT", "5432"),
		DatabaseUser:     getEnv("DB_USER", "postgres"),
		DatabasePassword: getEnv("DB_PASSWORD", "password"),
		DatabaseName:     getEnv("DB_NAME", "filevault"),
		DatabaseSSLMode:  getEnv("DB_SSL_MODE", "disable"),

		// JWT configuration
		JWTSecret:     getEnv("JWT_SECRET", "your-super-secret-jwt-key-change-in-production"),
		JWTExpiration: getEnvAsInt("JWT_EXPIRATION", 24), // 24 hours

		// Rate limiting configuration
		RateLimit:       getEnvAsInt("RATE_LIMIT", 2),            // 2 requests per second
		RateLimitWindow: getEnvAsInt("RATE_LIMIT_WINDOW", 1),     // 1 second window
		RateLimitBurst:  getEnvAsInt("RATE_LIMIT_BURST", 5),      // burst of 5
		EnableRateLimit: getEnvAsBool("ENABLE_RATE_LIMIT", true), // enabled by default
		RateLimitMode:   getEnv("RATE_LIMIT_MODE", "memory"),     // "memory" or "database"

		// Storage configuration
		StoragePath: getEnv("STORAGE_PATH", "./uploads"),
		AllowedMimeTypes: getEnvAsSlice("ALLOWED_MIME_TYPES", []string{
			"image/jpeg", "image/png", "image/gif", "image/webp",
			"application/pdf", "text/plain", "text/csv",
			"application/json", "application/xml",
			"application/zip", "application/x-rar-compressed",
			"video/mp4", "video/webm", "audio/mpeg", "audio/wav",
			"application/vnd.ms-excel",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"application/vnd.ms-excel.sheet.macroEnabled.12",
			"application/vnd.ms-excel.template.macroEnabled.12",
			"application/msword",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"application/vnd.ms-powerpoint",
			"application/vnd.openxmlformats-officedocument.presentationml.presentation",
		}),

		// Storage quota configuration
		DefaultUserQuota: getEnvAsInt64("DEFAULT_USER_QUOTA", 10485760), // 10MB default
		MaxFileSize:      getEnvAsInt64("MAX_FILE_SIZE", 104857600),     // 100MB max file
		AdminQuota:       getEnvAsInt64("ADMIN_QUOTA", 107374182400),    // 100GB for admins
		EnableQuotaCheck: getEnvAsBool("ENABLE_QUOTA_CHECK", true),      // enabled by default

		// CORS configuration
		AllowedOrigins: getEnvAsSlice("ALLOWED_ORIGINS", []string{"http://localhost:3000"}),
		AllowedMethods: getEnvAsSlice("ALLOWED_METHODS", []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
		AllowedHeaders: getEnvAsSlice("ALLOWED_HEADERS", []string{
			"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With",
		}),

		// File serving
		MaxDownloadSize: getEnvAsInt64("MAX_DOWNLOAD_SIZE", 1073741824), // 1GB
		DownloadTimeout: getEnvAsInt("DOWNLOAD_TIMEOUT", 300),           // 5 minutes
	}
}

// GetDatabaseDSN returns the database connection string
func (c *Config) GetDatabaseDSN() string {
	if c.DatabaseURL != "" {
		return c.DatabaseURL
	}

	return "host=" + c.DatabaseHost +
		" port=" + c.DatabasePort +
		" user=" + c.DatabaseUser +
		" password=" + c.DatabasePassword +
		" dbname=" + c.DatabaseName +
		" sslmode=" + c.DatabaseSSLMode
}

// IsProduction returns true if running in production environment
func (c *Config) IsProduction() bool {
	return c.Environment == "production"
}

// IsDevelopment returns true if running in development environment
func (c *Config) IsDevelopment() bool {
	return c.Environment == "development"
}

// Helper functions for environment variable parsing

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvAsInt64(key string, defaultValue int64) int64 {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.ParseInt(value, 10, 64); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvAsSlice(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		return strings.Split(value, ",")
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}
