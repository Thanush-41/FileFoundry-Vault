# UAT (User Acceptance Testing) Checklist

## File Vault System - BalkanID Capstone Project

### Authentication & User Management
- [ ] User can register with valid credentials
- [ ] User can login with correct username/password
- [ ] User cannot login with incorrect credentials
- [ ] Admin can access admin panel
- [ ] Regular user cannot access admin panel
- [ ] User can logout successfully
- [ ] Session persists on page refresh
- [ ] Session expires appropriately

### File Upload Functionality
- [ ] User can upload single file via button
- [ ] User can upload multiple files via button
- [ ] User can drag and drop single file
- [ ] User can drag and drop multiple files
- [ ] Upload progress indicator works
- [ ] File size validation works (within quota)
- [ ] MIME type validation prevents mismatched uploads
- [ ] Upload fails gracefully for oversized files
- [ ] Upload success message displays
- [ ] Uploaded files appear in file list

### File Deduplication
- [ ] Duplicate files are detected during upload
- [ ] Only one copy of duplicate content is stored
- [ ] User sees storage savings information
- [ ] Deduplication works across different users
- [ ] Reference counting prevents premature deletion
- [ ] Storage statistics show correct deduplicated size
- [ ] Admin can view global deduplication stats

### File Management
- [ ] User can view list of their files
- [ ] File metadata displays correctly (size, date, type)
- [ ] User can delete their own files
- [ ] User cannot delete files owned by others
- [ ] File deletion respects deduplication rules
- [ ] User can preview supported file types
- [ ] User can download their files
- [ ] Download counter increments correctly

### Folder Management
- [ ] User can create folders
- [ ] User can organize files into folders
- [ ] User can navigate folder structure
- [ ] User can move files between folders
- [ ] User can delete empty folders
- [ ] Folder deletion with files requires confirmation
- [ ] Folder path displays correctly

### File & Folder Sharing
- [ ] User can share files publicly
- [ ] User can share folders publicly
- [ ] User can set files/folders to private
- [ ] Public links work for anonymous users
- [ ] Private files require authentication
- [ ] User can share with specific users (bonus)
- [ ] Sharing permissions work correctly
- [ ] User can revoke sharing access

### Public File Features
- [ ] Public files show download counters
- [ ] Anonymous users can download public files
- [ ] Public file statistics update correctly
- [ ] Public file list shows properly
- [ ] Public file preview works

### Search & Filtering
- [ ] Search by filename works
- [ ] Search is case-insensitive
- [ ] Filter by MIME type works
- [ ] Filter by file size range works
- [ ] Filter by date range works
- [ ] Filter by uploader name works
- [ ] Multiple filters can be combined
- [ ] Search results display correctly
- [ ] Advanced search form works
- [ ] Search performance is acceptable

### Rate Limiting & Quotas
- [ ] API rate limiting enforced (2 calls/second)
- [ ] Rate limit error messages display
- [ ] Storage quota enforced (10MB default)
- [ ] Quota exceeded error messages display
- [ ] Storage usage displays correctly
- [ ] Admin can modify user quotas
- [ ] Quota warnings appear near limit

### Storage Statistics
- [ ] Total storage used displays correctly
- [ ] Original storage (without deduplication) shows
- [ ] Storage savings in bytes calculated correctly
- [ ] Storage savings percentage calculated correctly
- [ ] User-specific storage stats accurate
- [ ] Global storage stats accurate (admin)

### Admin Panel Functionality
- [ ] Admin can view all users
- [ ] Admin can view user details
- [ ] Admin can modify user roles
- [ ] Admin can view all files
- [ ] Admin can view file ownership
- [ ] Admin can see download statistics
- [ ] Admin can view system analytics
- [ ] Admin can manage storage quotas
- [ ] Admin dashboard displays correctly
- [ ] Admin can export data

### User Interface & Experience
- [ ] Navigation tabs work correctly
- [ ] Responsive design works on mobile
- [ ] Loading states display appropriately
- [ ] Error messages are user-friendly
- [ ] Success notifications appear
- [ ] Drag and drop visual feedback works
- [ ] File icons display correctly
- [ ] Progress bars function properly
- [ ] Modal dialogs work correctly
- [ ] Form validation provides clear feedback

### Performance & Reliability
- [ ] Page load times are acceptable
- [ ] File upload performance is reasonable
- [ ] Search queries respond quickly
- [ ] Large file handling works
- [ ] Concurrent user actions don't conflict
- [ ] Database queries are optimized
- [ ] Memory usage stays reasonable

### Security & Data Protection
- [ ] File access requires proper authentication
- [ ] Private files are not accessible to others
- [ ] Admin functions require admin role
- [ ] File upload security validation works
- [ ] SQL injection prevention works
- [ ] XSS prevention works
- [ ] CSRF protection works
- [ ] Secure file storage implementation

### Edge Cases & Error Handling
- [ ] Empty file upload handled gracefully
- [ ] Very large file upload handled
- [ ] Network interruption during upload
- [ ] Disk space full scenario
- [ ] Database connection loss handling
- [ ] Invalid file type handling
- [ ] Malformed request handling
- [ ] Concurrent delete operations

### Browser Compatibility
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in Edge
- [ ] Mobile browser compatibility
- [ ] JavaScript disabled fallback

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility
- [ ] Color contrast meets standards
- [ ] Alt text for images
- [ ] Focus indicators visible
- [ ] ARIA labels present