# FileFoundry API Testing Quick Reference
# Individual PowerShell commands for testing specific endpoints

# =============================================================================
# PREREQUISITES - Set these variables first
# =============================================================================
$BaseUrl = "http://localhost:8080"
$TestUser = "test.user@example.com"
$TestPassword = "testpass123"
$AdminUser = "admin@gmail.com"
$AdminPassword = "admin123"

# =============================================================================
# AUTHENTICATION COMMANDS
# =============================================================================

# Test Health Check
Invoke-RestMethod -Uri "$BaseUrl/health" -Method GET

# Register New User
$registerData = @{
    firstName = "Test"
    lastName = "User"
    username = "testuser"
    email = $TestUser
    password = $TestPassword
    confirmPassword = $TestPassword
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/register" -Method POST -Body $registerData -ContentType "application/json"

# Login User
$loginData = @{
    email = $TestUser
    password = $TestPassword
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/login" -Method POST -Body $loginData -ContentType "application/json"
$AuthToken = $loginResponse.token

# Login Admin
$adminLoginData = @{
    email = $AdminUser
    password = $AdminPassword
} | ConvertTo-Json

$adminResponse = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/login" -Method POST -Body $adminLoginData -ContentType "application/json"
$AdminToken = $adminResponse.token

# Get Current User Info
$headers = @{ "Authorization" = "Bearer $AuthToken" }
Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/me" -Method GET -Headers $headers

# =============================================================================
# FILE OPERATIONS
# =============================================================================

# List User Files
Invoke-RestMethod -Uri "$BaseUrl/api/v1/files" -Method GET -Headers $headers

# Get File Statistics
Invoke-RestMethod -Uri "$BaseUrl/api/v1/files/stats" -Method GET -Headers $headers

# Get Download Statistics
Invoke-RestMethod -Uri "$BaseUrl/api/v1/files/download-stats" -Method GET -Headers $headers

# List Public Files
Invoke-RestMethod -Uri "$BaseUrl/api/v1/files/public" -Method GET -Headers $headers

# Search Files
$searchData = @{
    query = "test"
    fileType = ""
    minSize = 0
    maxSize = 0
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BaseUrl/api/v1/files/search" -Method POST -Body $searchData -ContentType "application/json" -Headers $headers

# Upload File (Basic - requires multipart form data for actual files)
# Note: This is a simplified version. Real file upload requires multipart/form-data handling
$uploadData = @{
    filename = "test.txt"
    isPublic = $false
} | ConvertTo-Json

# For actual file upload, use:
# Invoke-RestMethod -Uri "$BaseUrl/api/v1/files/upload" -Method POST -InFile "path/to/file.txt" -Headers $headers

# Get Specific File (replace {file-id} with actual file ID)
# Invoke-RestMethod -Uri "$BaseUrl/api/v1/files/{file-id}" -Method GET -Headers $headers

# View File (replace {file-id} with actual file ID)
# Invoke-RestMethod -Uri "$BaseUrl/api/v1/files/{file-id}/view" -Method GET -Headers $headers

# Download File (replace {file-id} with actual file ID)
# Invoke-RestMethod -Uri "$BaseUrl/api/v1/files/{file-id}/download" -Method GET -Headers $headers

# Delete File (replace {file-id} with actual file ID)
# Invoke-RestMethod -Uri "$BaseUrl/api/v1/files/{file-id}" -Method DELETE -Headers $headers

# =============================================================================
# FOLDER OPERATIONS
# =============================================================================

# List Folders
Invoke-RestMethod -Uri "$BaseUrl/api/v1/folders" -Method GET -Headers $headers

# Get Folder Tree
Invoke-RestMethod -Uri "$BaseUrl/api/v1/folders/tree" -Method GET -Headers $headers

# Create Folder
$folderData = @{
    name = "Test Folder"
    parentFolderId = $null
} | ConvertTo-Json

$newFolder = Invoke-RestMethod -Uri "$BaseUrl/api/v1/folders" -Method POST -Body $folderData -ContentType "application/json" -Headers $headers
$FolderId = $newFolder.id

# Get Specific Folder
Invoke-RestMethod -Uri "$BaseUrl/api/v1/folders/$FolderId" -Method GET -Headers $headers

# Update Folder
$updateData = @{
    name = "Updated Test Folder"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BaseUrl/api/v1/folders/$FolderId" -Method PUT -Body $updateData -ContentType "application/json" -Headers $headers

# Delete Folder
Invoke-RestMethod -Uri "$BaseUrl/api/v1/folders/$FolderId" -Method DELETE -Headers $headers

# =============================================================================
# SHARING OPERATIONS
# =============================================================================

# Get Shared Files
Invoke-RestMethod -Uri "$BaseUrl/api/v1/shared-files" -Method GET -Headers $headers

# Get Shared Folders
Invoke-RestMethod -Uri "$BaseUrl/api/v1/shared-folders" -Method GET -Headers $headers

# Get Share Links
Invoke-RestMethod -Uri "$BaseUrl/api/v1/share-links" -Method GET -Headers $headers

# Get Folder Share Links
Invoke-RestMethod -Uri "$BaseUrl/api/v1/folder-share-links" -Method GET -Headers $headers

# Share File with User (replace {file-id} with actual file ID)
$shareData = @{
    email = "recipient@example.com"
    permission = "read"
} | ConvertTo-Json

# Invoke-RestMethod -Uri "$BaseUrl/api/v1/files/{file-id}/share" -Method POST -Body $shareData -ContentType "application/json" -Headers $headers

# Create Share Link (replace {file-id} with actual file ID)
$shareLinkData = @{
    expiryHours = 24
    maxDownloads = 5
} | ConvertTo-Json

# Invoke-RestMethod -Uri "$BaseUrl/api/v1/files/{file-id}/share-link" -Method POST -Body $shareLinkData -ContentType "application/json" -Headers $headers

# =============================================================================
# ADMIN OPERATIONS (requires admin token)
# =============================================================================

$adminHeaders = @{ "Authorization" = "Bearer $AdminToken" }

# Get Admin Statistics
Invoke-RestMethod -Uri "$BaseUrl/api/v1/admin/stats" -Method GET -Headers $adminHeaders

# Get All Users
Invoke-RestMethod -Uri "$BaseUrl/api/v1/admin/users" -Method GET -Headers $adminHeaders

# Get All Files with Statistics
Invoke-RestMethod -Uri "$BaseUrl/api/v1/admin/files" -Method GET -Headers $adminHeaders

# Get User Details (replace {user-id} with actual user ID)
# Invoke-RestMethod -Uri "$BaseUrl/api/v1/admin/users/{user-id}" -Method GET -Headers $adminHeaders

# Get Deduplication Summary
Invoke-RestMethod -Uri "$BaseUrl/api/v1/admin/deduplication/summary" -Method GET -Headers $adminHeaders

# Analytics Endpoints
Invoke-RestMethod -Uri "$BaseUrl/api/v1/admin/analytics/overview" -Method GET -Headers $adminHeaders
Invoke-RestMethod -Uri "$BaseUrl/api/v1/admin/analytics/user-registration-trend" -Method GET -Headers $adminHeaders
Invoke-RestMethod -Uri "$BaseUrl/api/v1/admin/analytics/file-upload-trend" -Method GET -Headers $adminHeaders
Invoke-RestMethod -Uri "$BaseUrl/api/v1/admin/analytics/download-trend" -Method GET -Headers $adminHeaders
Invoke-RestMethod -Uri "$BaseUrl/api/v1/admin/analytics/file-type-distribution" -Method GET -Headers $adminHeaders
Invoke-RestMethod -Uri "$BaseUrl/api/v1/admin/analytics/top-files" -Method GET -Headers $adminHeaders
Invoke-RestMethod -Uri "$BaseUrl/api/v1/admin/analytics/user-activity" -Method GET -Headers $adminHeaders
Invoke-RestMethod -Uri "$BaseUrl/api/v1/admin/analytics/storage-usage-trend" -Method GET -Headers $adminHeaders

# =============================================================================
# PUBLIC ENDPOINTS (no authentication required)
# =============================================================================

# View Public File (replace {file-id} with actual public file ID)
# Invoke-RestMethod -Uri "$BaseUrl/public-files/{file-id}/view" -Method GET

# Download Public File (replace {file-id} with actual public file ID)
# Invoke-RestMethod -Uri "$BaseUrl/public-files/{file-id}/download" -Method GET

# Access Shared File (replace {token} with actual share token)
# Invoke-RestMethod -Uri "$BaseUrl/share/{token}" -Method GET

# Download Shared File (replace {token} with actual share token)
# Invoke-RestMethod -Uri "$BaseUrl/share/{token}/download" -Method GET

# Access Shared Folder (replace {token} with actual folder share token)
# Invoke-RestMethod -Uri "$BaseUrl/folder-share/{token}" -Method GET

# =============================================================================
# ERROR HANDLING TESTS
# =============================================================================

# Test Unauthorized Access (should return 401)
try {
    Invoke-RestMethod -Uri "$BaseUrl/api/v1/files" -Method GET
} catch {
    Write-Host "Expected 401 Unauthorized: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test Invalid JWT Token (should return 401)
$invalidHeaders = @{ "Authorization" = "Bearer invalid.token.here" }
try {
    Invoke-RestMethod -Uri "$BaseUrl/api/v1/files" -Method GET -Headers $invalidHeaders
} catch {
    Write-Host "Expected 401 Invalid Token: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test Non-existent Endpoint (should return 404)
try {
    Invoke-RestMethod -Uri "$BaseUrl/api/v1/nonexistent" -Method GET
} catch {
    Write-Host "Expected 404 Not Found: $($_.Exception.Message)" -ForegroundColor Yellow
}

# =============================================================================
# LOGOUT
# =============================================================================

# Logout User
Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/logout" -Method POST -Headers $headers

# =============================================================================
# BATCH TESTING FUNCTIONS
# =============================================================================

function Test-AllEndpoints {
    Write-Host "Testing all endpoints..." -ForegroundColor Green
    
    # Run the comprehensive UAT script
    & ".\uat-api-tests.ps1" -BaseUrl $BaseUrl -TestUser $TestUser -TestPassword $TestPassword -AdminUser $AdminUser -AdminPassword $AdminPassword -Verbose
}

function Test-BasicFunctionality {
    Write-Host "Testing basic functionality..." -ForegroundColor Green
    
    # Health Check
    Write-Host "1. Health Check" -ForegroundColor Cyan
    Invoke-RestMethod -Uri "$BaseUrl/health" -Method GET
    
    # Login
    Write-Host "2. User Login" -ForegroundColor Cyan
    $loginData = @{ email = $TestUser; password = $TestPassword } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    $token = $response.token
    
    # List Files
    Write-Host "3. List Files" -ForegroundColor Cyan
    $headers = @{ "Authorization" = "Bearer $token" }
    Invoke-RestMethod -Uri "$BaseUrl/api/v1/files" -Method GET -Headers $headers
    
    Write-Host "Basic functionality test completed!" -ForegroundColor Green
}

# =============================================================================
# USAGE EXAMPLES
# =============================================================================

<#
# Quick Test Commands:

# 1. Run comprehensive UAT test suite:
.\uat-api-tests.ps1

# 2. Test basic functionality:
Test-BasicFunctionality

# 3. Test all endpoints with custom parameters:
.\uat-api-tests.ps1 -BaseUrl "http://localhost:8080" -TestUser "test@example.com" -TestPassword "password123" -Verbose

# 4. Test specific endpoint manually:
$headers = @{ "Authorization" = "Bearer YOUR_TOKEN_HERE" }
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/files" -Method GET -Headers $headers

# 5. Monitor API health:
while ($true) {
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:8080/health" -Method GET
        Write-Host "$(Get-Date): API Status - $($health.status)" -ForegroundColor Green
        Start-Sleep 10
    } catch {
        Write-Host "$(Get-Date): API Down - $($_.Exception.Message)" -ForegroundColor Red
        Start-Sleep 5
    }
}
#>