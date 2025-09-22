# Search & Filtering System

## Overview
The FileFoundry application now includes a comprehensive search and filtering system that allows users to quickly find files with advanced filtering options.

## Features

### Quick Search
- **Location**: Available from the main search page (`/search`) 
- **Access**: Click the search icon in the dashboard header or navigate to `/search`
- **Functionality**: Simple filename-based search with instant results

### Advanced Search
- **File Types**: Filter by MIME type categories (Images, Documents, Videos, Audio, Archives, etc.)
- **Size Range**: Filter files by size (bytes to TB range)
- **Date Range**: Filter by upload date with date pickers
- **Sorting**: Sort by name, size, date, or type (ascending/descending)
- **Combined Filters**: Apply multiple filters simultaneously for precise results

### Search Interface
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Grid/List Views**: Toggle between grid and list views for results
- **File Actions**: Download, preview, and share files directly from search results
- **Pagination**: Load more results as needed
- **Active Filters**: View and clear active filters easily

## API Endpoints

### Search Files
```
POST /api/files/search
```

**Request Body:**
```json
{
  "query": "filename search term",
  "mimeTypes": ["image/jpeg", "application/pdf"],
  "minSize": 1024,
  "maxSize": 10485760,
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "sortBy": "date",
  "sortOrder": "desc",
  "page": 1,
  "limit": 20
}
```

**Response:**
```json
{
  "files": [
    {
      "id": "file-uuid",
      "name": "document.pdf",
      "size": 1048576,
      "mimeType": "application/pdf",
      "uploadedAt": "2024-01-15T10:30:00Z",
      "downloadUrl": "/api/files/file-uuid/download",
      "previewUrl": "/api/files/file-uuid/preview"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "hasMore": true
}
```

### Enhanced List Files
```
GET /api/files?query=search&mimeType=image/*&sortBy=size&sortOrder=asc
```

## Performance Optimizations

### Database Indexing
- **File names**: B-tree index for fast text searches
- **MIME types**: Index for efficient type filtering
- **Upload dates**: Index for date range queries
- **Composite indexes**: Combined indexes for multi-field queries

### Query Optimization
- **Pagination**: Limit results per page to prevent memory issues
- **Prepared statements**: Prevent SQL injection and improve performance
- **Selective loading**: Only load required fields for search results
- **Caching**: Future enhancement for frequently searched terms

### Frontend Performance
- **Lazy loading**: Load search results as user scrolls
- **Debouncing**: Prevent excessive API calls during typing
- **Result caching**: Cache search results to avoid duplicate requests
- **Virtual scrolling**: For large result sets (future enhancement)

## Usage Examples

### Basic Search
1. Navigate to the search page
2. Enter filename in the quick search bar
3. Press Enter or click Search button
4. Results appear with file information and actions

### Advanced Search
1. Click the filter icon in the search bar
2. Select desired file types from categories
3. Set size range using sliders or direct input
4. Choose date range with date pickers
5. Select sorting preference
6. Click "Search" to apply filters
7. View results with active filters displayed

### Integration with Dashboard
- Search icon in dashboard header provides quick access
- Search results can be downloaded, previewed, or shared
- Integration with existing file management features

## Technical Implementation

### Backend Components
- **Search handler**: `internal/handlers/file.go`
- **Database queries**: Optimized PostgreSQL queries with proper indexing
- **Request validation**: Type-safe request parsing and validation
- **Error handling**: Comprehensive error responses with user-friendly messages

### Frontend Components
- **SearchPage**: Main search interface (`components/SearchPage.tsx`)
- **AdvancedSearch**: Advanced filter dialog (`components/AdvancedSearch.tsx`)
- **SearchResults**: Results display component (`components/SearchResults.tsx`)
- **useSearch**: Custom hook for search logic (`hooks/useSearch.ts`)

### Type Safety
- **TypeScript interfaces**: Strongly typed search filters and results
- **API contract**: Consistent request/response structure
- **Error handling**: Type-safe error management throughout the stack

## Future Enhancements

### Planned Features
- **Full-text search**: Search within document content
- **Tag-based filtering**: User-defined tags for files
- **Saved searches**: Save frequently used search filters
- **Search history**: Recent searches for quick access
- **Bulk operations**: Select multiple files from search results

### Performance Improvements
- **Search suggestions**: Auto-complete for filenames
- **Result highlighting**: Highlight search terms in results
- **Advanced caching**: Redis-based result caching
- **Search analytics**: Track popular searches for optimization

This search system provides a solid foundation for file discovery and management, with room for future enhancements based on user feedback and usage patterns.