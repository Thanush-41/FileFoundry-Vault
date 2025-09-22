# Rate Limiting & Quotas Implementation

## Overview
Comprehensive rate limiting and quota enforcement system with configurable limits and proper error handling.

## Features Implemented

### 1. API Rate Limiting
- **Default Rate**: 2 calls per second per user
- **Configurable**: Set via `RATE_LIMIT_CALLS` and `RATE_LIMIT_WINDOW` environment variables
- **Modes**: Memory-based (default) or database-based rate limiting
- **Admin Bypass**: Administrators exempt from rate limits when `ADMIN_BYPASS_RATE_LIMIT=true`

### 2. Storage Quotas
- **Default User Quota**: 10 MB per user
- **Admin Quota**: 1 GB (configurable via `ADMIN_QUOTA`)
- **Configurable**: Set via `STORAGE_QUOTA` environment variable
- **Real-time Enforcement**: Checked before file uploads

### 3. File Size Limits
- **Default Max File Size**: 100 MB per file
- **Configurable**: Set via `MAX_FILE_SIZE` environment variable
- **Pre-upload Validation**: Files rejected before processing if too large

## Configuration Environment Variables

```bash
# Rate Limiting
ENABLE_RATE_LIMIT=true                # Enable/disable rate limiting
RATE_LIMIT_MODE=memory               # "memory" or "database"
RATE_LIMIT_CALLS=2                   # Calls per window
RATE_LIMIT_WINDOW=1                  # Window in seconds
ADMIN_BYPASS_RATE_LIMIT=true         # Allow admins to bypass limits

# Storage Quotas
ENABLE_QUOTA_CHECK=true              # Enable/disable quota enforcement
STORAGE_QUOTA=10485760               # 10MB user quota in bytes
ADMIN_QUOTA=1073741824               # 1GB admin quota in bytes

# File Size Limits
MAX_FILE_SIZE=104857600              # 100MB max file size in bytes
```

## Error Responses

### Rate Limit Exceeded
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

### Storage Quota Exceeded
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

### File Size Limit Exceeded
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

## Implementation Details

### Middleware Integration
1. **Global Rate Limiting**: Applied to all API routes
2. **Storage Quota Middleware**: Applied to file upload endpoints
3. **File Size Middleware**: Applied to file upload endpoints
4. **Admin Routes**: Conditionally apply limits based on configuration

### Database Integration
- Rate limiting can use database for distributed systems
- Storage calculations include real-time file size tracking
- Admin role detection for quota exemptions

### Performance Considerations
- Memory-based rate limiting for better performance in single-instance deployments
- Database-based rate limiting for horizontal scaling
- Efficient storage calculation queries
- Pre-upload validation to prevent unnecessary processing

## Testing Rate Limits

1. **Memory Rate Limiting**: Default mode, reset on server restart
2. **Database Rate Limiting**: Persistent across restarts, suitable for production
3. **Admin Exemptions**: Test with admin accounts to verify bypass functionality
4. **Quota Enforcement**: Upload files to test storage limit enforcement
5. **File Size Limits**: Attempt to upload files larger than configured limit

## Security Features

- **Per-user Isolation**: Each user has independent rate limits and quotas
- **Admin Controls**: Separate limits and bypass options for administrators
- **Detailed Logging**: Rate limit and quota violations are logged
- **Graceful Degradation**: System continues to function even if rate limiting fails
- **Configurable Error Messages**: Detailed feedback without exposing system internals