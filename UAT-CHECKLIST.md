# FileFoundry UAT (User Acceptance Testing) Checklist

## 📋 Overview
This UAT checklist ensures that all FileFoundry application features meet the specified requirements and work correctly in a production-like environment.

## 🚀 Quick Start
```powershell
# 1. Start all services
docker-compose up -d

# 2. Run comprehensive API tests (100% automated coverage)
.\uat-api-tests.ps1

# 3. Check individual endpoints (optional)
.\api-test-commands.ps1
```

## ✅ Pre-Testing Requirements

### Environment Setup
- [ ] Docker and Docker Compose installed
- [ ] All services running (`docker-compose up -d`)
- [ ] Backend accessible on port 8080
- [ ] Frontend accessible on port 3000
- [ ] Database accessible on port 5432
- [ ] Redis accessible on port 6379

### Test Data Setup
- [ ] Admin user exists (admin@example.com / admin123)
- [ ] Test user can be created
- [ ] Sample files available for testing
- [ ] Database migrations completed

## 🔐 Authentication & Authorization Tests

### User Registration
- [ ] Register with valid data succeeds
- [ ] Email validation works
- [ ] Password strength validation works
- [ ] Duplicate email registration fails
- [ ] Required fields validation works
- [ ] Username uniqueness validation works

**PowerShell Test:**
```powershell
$registerData = @{
    firstName = "Test"
    lastName = "User" 
    username = "testuser"
    email = "test@example.com"
    password = "testpass123"
    confirmPassword = "testpass123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/register" -Method POST -Body $registerData -ContentType "application/json"
```

### User Login
- [ ] Login with valid credentials succeeds
- [ ] JWT token is returned
- [ ] Login with invalid credentials fails
- [ ] Email format validation works
- [ ] Rate limiting on login attempts works

**PowerShell Test:**
```powershell
$loginData = @{
    email = "test@example.com"
    password = "testpass123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" -Method POST -Body $loginData -ContentType "application/json"
$token = $response.token
```

### Session Management
- [ ] JWT token validates correctly
- [ ] Protected routes require authentication
- [ ] Token expiration handled properly
- [ ] Logout functionality works
- [ ] Session persistence works

## 📁 File Management Tests

### File Upload
- [ ] Single file upload works
- [ ] Multiple file upload works
- [ ] Drag and drop upload works
- [ ] File type validation works
- [ ] File size validation works
- [ ] Storage quota enforcement works
- [ ] Upload progress indication works
- [ ] Duplicate file handling works

**PowerShell Test:**
```powershell
$headers = @{ "Authorization" = "Bearer $token" }
# Note: Actual file upload requires multipart form data
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/files/upload" -Method POST -Headers $headers
```

### File Operations
- [ ] List files works
- [ ] File details view works
- [ ] File download works
- [ ] File deletion works
- [ ] File renaming works
- [ ] File moving works
- [ ] File preview works (for supported types)

**PowerShell Test:**
```powershell
# List files
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/files" -Method GET -Headers $headers

# Get file stats
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/files/stats" -Method GET -Headers $headers
```

### File Sharing
- [ ] Share file with specific user works
- [ ] Create public share link works
- [ ] Share link expiration works
- [ ] Download limit enforcement works
- [ ] Share permissions work correctly
- [ ] Revoke sharing works

## 📂 Folder Management Tests

### Folder Operations
- [ ] Create folder works
- [ ] List folders works
- [ ] Folder tree view works
- [ ] Rename folder works
- [ ] Move folder works
- [ ] Delete folder works
- [ ] Nested folder creation works

**PowerShell Test:**
```powershell
# Create folder
$folderData = @{
    name = "Test Folder"
    parentFolderId = $null
} | ConvertTo-Json

$folder = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/folders" -Method POST -Body $folderData -ContentType "application/json" -Headers $headers

# List folders
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/folders" -Method GET -Headers $headers
```

### Folder Sharing
- [ ] Share folder with user works
- [ ] Create folder share link works
- [ ] Folder permission inheritance works
- [ ] Revoke folder sharing works

## 🔍 Search & Filter Tests

### Search Functionality
- [ ] Basic filename search works
- [ ] Case-insensitive search works
- [ ] Search within file content works (if supported)
- [ ] Advanced search with filters works
- [ ] Search result highlighting works
- [ ] Search suggestions work

**PowerShell Test:**
```powershell
$searchData = @{
    query = "test"
    fileType = ""
    minSize = 0
    maxSize = 0
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/api/v1/files/search" -Method POST -Body $searchData -ContentType "application/json" -Headers $headers
```

### Filtering Options
- [ ] Filter by file type works
- [ ] Filter by file size works
- [ ] Filter by date range works
- [ ] Filter by sharing status works
- [ ] Combined filters work correctly
- [ ] Clear filters works

## 👨‍💼 Admin Panel Tests

### User Management
- [ ] View all users works
- [ ] View user details works
- [ ] View user files works
- [ ] Modify user roles works
- [ ] View user statistics works

**PowerShell Test:**
```powershell
$adminHeaders = @{ "Authorization" = "Bearer $adminToken" }

# Get all users
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/users" -Method GET -Headers $adminHeaders

# Get admin stats
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/stats" -Method GET -Headers $adminHeaders
```

### File Management
- [ ] View all files works
- [ ] View file statistics works
- [ ] Admin file upload works
- [ ] Make files public/private works
- [ ] View file download stats works

### System Analytics
- [ ] System overview analytics work
- [ ] User registration trends work
- [ ] File upload trends work
- [ ] Download trends work
- [ ] File type distribution works
- [ ] Top files analytics work
- [ ] User activity analytics work
- [ ] Storage usage trends work

**PowerShell Test:**
```powershell
# Test all analytics endpoints
$analyticsEndpoints = @(
    "overview", "user-registration-trend", "file-upload-trend", 
    "download-trend", "file-type-distribution", "top-files",
    "user-activity", "storage-usage-trend"
)

foreach ($endpoint in $analyticsEndpoints) {
    Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/analytics/$endpoint" -Method GET -Headers $adminHeaders
}
```

### Deduplication Management
- [ ] View deduplication summary works
- [ ] View user deduplication details works
- [ ] Storage savings calculation works

## 🌐 Public Access Tests

### Public File Access
- [ ] Public file viewing works (no auth required)
- [ ] Public file downloading works
- [ ] Public file listing works
- [ ] Private files are not accessible publicly

**PowerShell Test:**
```powershell
# Test public file access (should work without authentication)
Invoke-RestMethod -Uri "http://localhost:8080/public-files/VALID_FILE_ID/view" -Method GET
```

### Share Link Access
- [ ] Share link access works
- [ ] Share link download works
- [ ] Expired links are rejected
- [ ] Download limit enforcement works

## 📊 Performance & Security Tests

### Performance Tests
- [ ] File upload performance acceptable
- [ ] File download performance acceptable
- [ ] Search response time acceptable
- [ ] Large file handling works
- [ ] Concurrent user handling works

### Security Tests
- [ ] SQL injection protection works
- [ ] XSS protection works
- [ ] CSRF protection works
- [ ] File type validation prevents malicious uploads
- [ ] Authentication bypass attempts fail
- [ ] Rate limiting works correctly

**PowerShell Test:**
```powershell
# Test rate limiting
for ($i = 1; $i -le 20; $i++) {
    try {
        Invoke-RestMethod -Uri "http://localhost:8080/api/v1/files" -Method GET -Headers $headers
        Write-Host "Request $i: Success"
    } catch {
        Write-Host "Request $i: Rate limited" -ForegroundColor Yellow
    }
    Start-Sleep 0.1
}
```

## 🚨 Error Handling Tests

### API Error Handling
- [ ] 400 Bad Request for invalid data
- [ ] 401 Unauthorized for missing auth
- [ ] 403 Forbidden for insufficient permissions
- [ ] 404 Not Found for missing resources
- [ ] 413 Payload Too Large for oversized files
- [ ] 429 Too Many Requests for rate limiting
- [ ] 500 Internal Server Error handling

**PowerShell Test:**
```powershell
# Test unauthorized access
try {
    Invoke-RestMethod -Uri "http://localhost:8080/api/v1/files" -Method GET
} catch {
    Write-Host "Expected 401: $($_.Exception.Message)"
}

# Test invalid token
$invalidHeaders = @{ "Authorization" = "Bearer invalid.token" }
try {
    Invoke-RestMethod -Uri "http://localhost:8080/api/v1/files" -Method GET -Headers $invalidHeaders
} catch {
    Write-Host "Expected 401: $($_.Exception.Message)"
}
```

### UI Error Handling
- [ ] Network error handling
- [ ] Upload failure handling
- [ ] Invalid form submission handling
- [ ] Session expiry handling
- [ ] User-friendly error messages

## 🔧 Integration Tests

### Database Integration
- [ ] Data persistence works
- [ ] Database migrations work
- [ ] Backup and restore work
- [ ] Database connection handling

### External Service Integration
- [ ] File storage service works
- [ ] Email service works (if implemented)
- [ ] Cache service (Redis) works
- [ ] Third-party authentication (if implemented)

## 📱 Cross-Platform Tests

### Browser Compatibility
- [ ] Chrome functionality works
- [ ] Firefox functionality works
- [ ] Safari functionality works
- [ ] Edge functionality works
- [ ] Mobile browsers work

### Device Compatibility
- [ ] Desktop functionality works
- [ ] Tablet functionality works
- [ ] Mobile functionality works
- [ ] Responsive design works

## 🎯 Business Logic Tests

### Storage Management
- [ ] Storage quota calculation works
- [ ] Deduplication works correctly
- [ ] Storage statistics are accurate
- [ ] Quota enforcement works

### File Versioning (if implemented)
- [ ] File version creation works
- [ ] Version history access works
- [ ] Version restoration works
- [ ] Version deletion works

## 📋 Final Checklist

### Pre-Production Verification
- [ ] All critical functionality tested
- [ ] Performance benchmarks met
- [ ] Security requirements satisfied
- [ ] User experience validated
- [ ] Documentation complete
- [ ] Backup procedures tested
- [ ] Monitoring setup complete

### Sign-off Requirements
- [ ] Technical team approval
- [ ] Product owner approval
- [ ] Security team approval
- [ ] Performance team approval
- [ ] User representative approval

## 🔧 Troubleshooting

### Common Issues
1. **Services not starting**: Check Docker containers with `docker-compose ps`
2. **Authentication failures**: Verify admin user credentials in database
3. **File upload failures**: Check storage permissions and quota settings
4. **API timeouts**: Verify network connectivity and service health

### Debug Commands
```powershell
# Check service health
docker-compose ps
docker-compose logs backend
docker-compose logs frontend

# Test basic connectivity
Invoke-RestMethod -Uri "http://localhost:8080/health" -Method GET
Invoke-RestMethod -Uri "http://localhost:3000" -Method GET

# Run diagnostics
.\uat-api-tests.ps1 -Verbose
```

## 📊 Test Execution Summary

After completing all tests, generate a summary report:

```powershell
# Run comprehensive test suite
.\uat-api-tests.ps1 -Verbose > uat-results.txt

# Generate test report
$testResults = Get-Content uat-results.txt
$passedTests = ($testResults | Select-String "✅ PASS").Count
$failedTests = ($testResults | Select-String "❌ FAIL").Count
$totalTests = $passedTests + $failedTests
$passRate = [math]::Round(($passedTests / $totalTests) * 100, 2)

Write-Host "UAT Test Summary:" -ForegroundColor Blue
Write-Host "Total Tests: $totalTests" -ForegroundColor Cyan
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $failedTests" -ForegroundColor Red
Write-Host "Pass Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 90) { "Green" } else { "Yellow" })
```

---

**✅ UAT Completion Criteria**: All critical functionality tests must pass with a minimum 90% pass rate for production readiness.