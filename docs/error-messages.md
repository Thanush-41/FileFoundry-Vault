# Error Messages Documentation

## Overview
This document shows all the user-friendly error messages that the Rate Limiting & Quotas system returns to users when limits are exceeded.

## Error Message Format
All error responses follow a consistent JSON format:

```json
{
  "error": "Brief error title",
  "type": "ERROR_TYPE_CODE", 
  "message": "Detailed user-friendly explanation",
  "code": "SPECIFIC_ERROR_CODE",
  // Additional context-specific fields
}
```

## Rate Limiting Errors

### HTTP 429 - Rate Limit Exceeded

**Memory-based Rate Limiting:**
```json
{
  "error": "Rate limit exceeded",
  "type": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. You have exceeded the limit of 2 calls per 1 second(s). Please try again later.",
  "retry_after": 1,
  "limit": 2,
  "window": 1,
  "code": "RATE_LIMIT_ERROR"
}
```

**Database-based Rate Limiting:**
```json
{
  "error": "Rate limit exceeded", 
  "type": "RATE_LIMIT_EXCEEDED",
  "message": "You have exceeded the limit of 2 requests per 1s for this endpoint. Please wait before trying again.",
  "retry_after": 5,
  "limit": 2,
  "window": "1s",
  "endpoint": "/api/v1/files/",
  "code": "RATE_LIMIT_ERROR"
}
```

## Storage Quota Errors

### HTTP 403 - Storage Quota Exceeded

**When user's quota is fully used:**
```json
{
  "error": "Storage quota exceeded",
  "type": "STORAGE_QUOTA_EXCEEDED", 
  "message": "Your storage quota of 10.00 MB is fully used. Please delete some files to free up space or contact support to increase your quota.",
  "quota_info": {
    "total_quota": 10485760,
    "used_storage": 10485760,
    "available_storage": 0,
    "quota_mb": 10.0,
    "used_mb": 10.0,
    "available_mb": 0.0
  },
  "code": "QUOTA_EXCEEDED"
}
```

**When file upload would exceed quota:**
```json
{
  "error": "Storage quota exceeded",
  "type": "STORAGE_QUOTA_EXCEEDED",
  "message": "Upload would exceed your storage quota of 10.00 MB. Used: 8.50 MB, Available: 1.50 MB, File size: 2.00 MB",
  "quota_info": {
    "total_quota": 10485760,
    "used_storage": 8912896,
    "available_storage": 1572864,
    "file_size": 2097152,
    "quota_mb": 10.0,
    "used_mb": 8.5,
    "available_mb": 1.5,
    "file_mb": 2.0
  },
  "code": "UPLOAD_EXCEEDS_QUOTA"
}
```

## File Size Errors

### HTTP 413 - Request Entity Too Large

**File size exceeds maximum limit:**
```json
{
  "error": "File too large",
  "type": "FILE_SIZE_EXCEEDED",
  "message": "File size 157.29 MB exceeds the maximum allowed size of 100.00 MB",
  "max_size": 104857600,
  "file_size": 164928512, 
  "max_size_mb": 100.0,
  "file_size_mb": 157.29,
  "code": "FILE_TOO_LARGE"
}
```

## Authentication Errors

### HTTP 401 - Unauthorized

**Authentication required:**
```json
{
  "error": "Authentication required",
  "type": "AUTHENTICATION_REQUIRED",
  "message": "You must be logged in to upload files",
  "code": "AUTH_REQUIRED"
}
```

### HTTP 500 - Internal Server Error

**Invalid session:**
```json
{
  "error": "Invalid user session",
  "type": "SERVER_ERROR", 
  "message": "Your session appears to be corrupted. Please log in again",
  "code": "INVALID_SESSION"
}
```

**User not found:**
```json
{
  "error": "User account not found",
  "type": "SERVER_ERROR",
  "message": "Your user account could not be found. Please contact support", 
  "code": "USER_NOT_FOUND"
}
```

**Database error:**
```json
{
  "error": "Database error during rate limit check",
  "type": "SERVER_ERROR",
  "message": "Unable to verify rate limit status. Please try again",
  "code": "DATABASE_ERROR"
}
```

## Response Headers

### Rate Limiting Headers
All rate-limited endpoints include these headers:
- `X-RateLimit-Limit`: Maximum requests allowed per window
- `X-RateLimit-Remaining`: Requests remaining in current window  
- `X-RateLimit-Reset`: Unix timestamp when window resets
- `Retry-After`: Seconds to wait before next request (on 429 errors)

### Storage Quota Headers
Authenticated responses include quota information:
- `X-Storage-Quota`: Total storage quota in bytes
- `X-Storage-Used`: Used storage in bytes
- `X-Storage-Remaining`: Available storage in bytes
- `X-Storage-Usage-Percent`: Usage percentage (0-100)

## Error Type Codes

### Rate Limiting
- `RATE_LIMIT_EXCEEDED`: Too many requests within time window

### Storage Quota  
- `STORAGE_QUOTA_EXCEEDED`: Quota limit reached or would be exceeded
- `QUOTA_EXCEEDED`: Current usage equals quota
- `UPLOAD_EXCEEDS_QUOTA`: Specific upload would exceed quota

### File Size
- `FILE_SIZE_EXCEEDED`: File larger than maximum allowed size
- `FILE_TOO_LARGE`: Alternative code for file size errors

### Authentication
- `AUTHENTICATION_REQUIRED`: User must log in
- `AUTH_REQUIRED`: Alternative auth error code

### Server Errors
- `SERVER_ERROR`: Internal server/database issues
- `INVALID_SESSION`: Session corruption
- `USER_NOT_FOUND`: User account missing
- `DATABASE_ERROR`: Database operation failed

## User Experience Benefits

### Clear Communication
- **User-friendly language**: Avoids technical jargon
- **Specific guidance**: Tells users exactly what to do
- **Contextual information**: Provides relevant details (quotas, limits, etc.)

### Actionable Messages
- **Delete files**: When quota exceeded
- **Wait before retry**: When rate limited (with specific times)
- **Contact support**: For account issues
- **Log in again**: For session problems

### Consistent Format
- **Structured JSON**: Easy for frontend applications to parse
- **Standard HTTP codes**: 429, 403, 413, 401, 500
- **Predictable fields**: `error`, `type`, `message`, `code` always present
- **Rich context**: Additional fields provide implementation details