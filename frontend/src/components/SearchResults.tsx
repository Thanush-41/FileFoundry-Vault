import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Button,
  Skeleton,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Download,
  Visibility,
  Share,
  Description,
  Image,
  VideoFile,
  AudioFile,
  InsertDriveFile,
  Archive,
  Code,
  PictureAsPdf,
  TableChart,
  Slideshow,
  Person,
  Schedule,
  Storage,
  Public,
  Lock,
} from '@mui/icons-material';
import { SearchResult } from '../hooks/useSearch';

interface SearchResultsProps {
  results: SearchResult[];
  total: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
  onLoadMore: () => void;
  onDownload: (file: SearchResult) => void;
  onPreview: (file: SearchResult) => void;
  onShare: (file: SearchResult) => void;
}

const getFileIcon = (mimeType: string | undefined, size: 'small' | 'medium' | 'large' = 'medium') => {
  const fontSize = size === 'small' ? 'small' as const : size === 'large' ? 'large' as const : 'medium' as const;

  if (!mimeType) {
    return <InsertDriveFile fontSize={fontSize} color="action" />;
  }
  
  if (mimeType.startsWith('image/')) {
    return <Image fontSize={fontSize} sx={{ color: '#4CAF50' }} />;
  }
  if (mimeType.startsWith('video/')) {
    return <VideoFile fontSize={fontSize} sx={{ color: '#F44336' }} />;
  }
  if (mimeType.startsWith('audio/')) {
    return <AudioFile fontSize={fontSize} sx={{ color: '#9C27B0' }} />;
  }
  if (mimeType === 'application/pdf') {
    return <PictureAsPdf fontSize={fontSize} sx={{ color: '#FF5722' }} />;
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return <TableChart fontSize={fontSize} sx={{ color: '#4CAF50' }} />;
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return <Slideshow fontSize={fontSize} sx={{ color: '#FF9800' }} />;
  }
  if (mimeType.includes('document') || mimeType.includes('word')) {
    return <Description fontSize={fontSize} sx={{ color: '#2196F3' }} />;
  }
  if (mimeType.includes('zip') || mimeType.includes('archive')) {
    return <Archive fontSize={fontSize} sx={{ color: '#795548' }} />;
  }
  if (mimeType.startsWith('text/') || mimeType.includes('code')) {
    return <Code fontSize={fontSize} sx={{ color: '#607D8B' }} />;
  }
  
  return <InsertDriveFile fontSize={fontSize} color="action" />;
};

const formatFileSize = (bytes: number | undefined) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'Unknown date';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return 'Invalid date';
  }
};

const getFileTypeLabel = (mimeType: string | undefined) => {
  if (!mimeType) return 'File';
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Spreadsheet';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Presentation';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'Document';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return 'Archive';
  if (mimeType.startsWith('text/')) return 'Text';
  return 'File';
};

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  total,
  loading,
  error,
  hasMore,
  currentPage,
  onLoadMore,
  onDownload,
  onPreview,
  onShare,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  if (loading && results.length === 0) {
    return (
      <Box>
        <LinearProgress sx={{ mb: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Card key={n}>
              <CardContent>
                <Skeleton variant="rectangular" height={40} sx={{ mb: 2 }} />
                <Skeleton variant="text" height={24} sx={{ mb: 1 }} />
                <Skeleton variant="text" height={20} width="60%" />
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (results.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <InsertDriveFile sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No files found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Try adjusting your search criteria or filters
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Results Header */}
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        mb={3}
        flexWrap="wrap"
        gap={2}
      >
        <Typography variant="h6">
          {(total || 0).toLocaleString()} files found
        </Typography>
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>View</InputLabel>
          <Select
            value={viewMode}
            label="View"
            onChange={(e) => setViewMode(e.target.value as 'grid' | 'list')}
          >
            <MenuItem value="grid">Grid</MenuItem>
            <MenuItem value="list">List</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Results Grid/List */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr',
        gap: 2 
      }}>
        {results.map((file) => (
          <Card 
            key={file.id}
            elevation={1}
            sx={{ 
              height: '100%',
              display: 'flex',
              flexDirection: viewMode === 'list' ? 'row' : 'column',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 3,
              },
            }}
          >
            <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: viewMode === 'list' ? 'row' : 'column', p: 2 }}>
              {viewMode === 'grid' ? (
                <>
                  {/* File Icon and Type */}
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    {getFileIcon(file.mimeType, 'large')}
                    <Box display="flex" gap={0.5}>
                      <Chip 
                        size="small" 
                        label={getFileTypeLabel(file.mimeType)}
                        variant="outlined"
                      />
                      {file.isPublic ? (
                        <Tooltip title="Public file">
                          <Public fontSize="small" color="action" />
                        </Tooltip>
                      ) : (
                        <Tooltip title="Private file">
                          <Lock fontSize="small" color="action" />
                        </Tooltip>
                      )}
                    </Box>
                  </Box>

                  {/* File Name */}
                  <Typography 
                    variant="subtitle1" 
                    component="h3"
                    sx={{ 
                      fontWeight: 600,
                      mb: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: 1.2,
                    }}
                    title={file.name}
                  >
                    {file.name}
                  </Typography>

                  {/* File Info */}
                  <Box sx={{ flexGrow: 1, mb: 2 }}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Storage fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {formatFileSize(file.size)}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Person fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {file.uploaderName || 'Unknown'}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={1}>
                      <Schedule fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(file.uploadedAt)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Actions */}
                  <Box display="flex" justifyContent="space-between">
                    <Tooltip title="Preview">
                      <IconButton 
                        size="small" 
                        onClick={() => onPreview(file)}
                        color="primary"
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Download">
                      <IconButton 
                        size="small" 
                        onClick={() => onDownload(file)}
                        color="primary"
                      >
                        <Download />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Share">
                      <IconButton 
                        size="small" 
                        onClick={() => onShare(file)}
                        color="primary"
                      >
                        <Share />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </>
              ) : (
                <>
                  {/* File Icon */}
                  <Box sx={{ mr: 2, flexShrink: 0 }}>
                    {getFileIcon(file.mimeType, 'medium')}
                  </Box>

                  {/* File Info */}
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography 
                      variant="subtitle1" 
                      component="h3"
                      sx={{ 
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={file.name}
                    >
                      {file.name}
                    </Typography>
                    
                    <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                      <Typography variant="body2" color="text.secondary">
                        {formatFileSize(file.size)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {file.uploaderName || 'Unknown'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(file.uploadedAt)}
                      </Typography>
                      <Chip 
                        size="small" 
                        label={getFileTypeLabel(file.mimeType)}
                        variant="outlined"
                      />
                      {file.isPublic ? (
                        <Chip size="small" label="Public" color="success" variant="outlined" />
                      ) : (
                        <Chip size="small" label="Private" color="default" variant="outlined" />
                      )}
                    </Box>
                  </Box>

                  {/* Actions */}
                  <Box display="flex" gap={1} sx={{ flexShrink: 0, ml: 2 }}>
                    <Tooltip title="Preview">
                      <IconButton 
                        size="small" 
                        onClick={() => onPreview(file)}
                        color="primary"
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Download">
                      <IconButton 
                        size="small" 
                        onClick={() => onDownload(file)}
                        color="primary"
                      >
                        <Download />
                      </IconButton>
                    </Tooltip>
                    
                    <Tooltip title="Share">
                      <IconButton 
                        size="small" 
                        onClick={() => onShare(file)}
                        color="primary"
                      >
                        <Share />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Load More / Loading */}
      {hasMore && (
        <Box textAlign="center" mt={4}>
          <Button
            variant="outlined"
            onClick={onLoadMore}
            disabled={loading}
            size="large"
          >
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        </Box>
      )}

      {loading && results.length > 0 && (
        <Box mt={2}>
          <LinearProgress />
        </Box>
      )}
    </Box>
  );
};