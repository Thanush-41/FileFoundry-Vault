import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Pagination,
  InputAdornment,
  Alert,
} from '@mui/material';
import {
  Description,
  Image,
  VideoFile,
  AudioFile,
  Download,
  Visibility,
  Search,
  Public,
  Person,
  AdminPanelSettings,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface PublicFile {
  id: string;
  filename: string;
  original_filename: string;
  size: number;
  mime_type: string;
  created_at: string;
  is_public: boolean;
  share_count: number;
  owner: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}

interface PublicFilesResponse {
  files: PublicFile[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    has_next: boolean;
    has_prev: boolean;
    limit: number;
  };
}

export const PublicFilesView: React.FC = () => {
  const { token } = useAuth();
  const [files, setFiles] = useState<PublicFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState<PublicFilesResponse['pagination']>({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    has_next: false,
    has_prev: false,
    limit: 20,
  });
  const [selectedFile, setSelectedFile] = useState<PublicFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const fetchPublicFiles = async (page: number = 1, search: string = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      
      if (search.trim()) {
        params.append('search', search.trim());
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/files/public?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data: PublicFilesResponse = await response.json();
        setFiles(data.files);
        setPagination(data.pagination);
      } else {
        console.error('Failed to fetch public files');
      }
    } catch (error) {
      console.error('Error fetching public files:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicFiles(currentPage, searchQuery);
  }, [currentPage, token]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchPublicFiles(1, searchQuery);
  };

  const handleSearchKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image />;
    if (mimeType.startsWith('video/')) return <VideoFile />;
    if (mimeType.startsWith('audio/')) return <AudioFile />;
    return <Description />;
  };

  const getFileTypeColor = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'success';
    if (mimeType.startsWith('video/')) return 'info';
    if (mimeType.startsWith('audio/')) return 'warning';
    return 'default';
  };

  const handleDownload = async (file: PublicFile) => {
    try {
      // Use public download endpoint that doesn't require authentication
      const response = await fetch(`${process.env.REACT_APP_API_URL}/public-files/${file.id}/download`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.original_filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Refresh the list to update download count
        fetchPublicFiles(currentPage, searchQuery);
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handlePreview = (file: PublicFile) => {
    setSelectedFile(file);
    setPreviewOpen(true);
  };

  if (loading && files.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Public />
          Public Files
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Browse and download files that have been made public by users
        </Typography>

        {/* Search */}
        <TextField
          fullWidth
          placeholder="Search public files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleSearchKeyPress}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Button variant="contained" size="small" onClick={handleSearch}>
                  Search
                </Button>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />
      </Box>

      {files.length === 0 ? (
        <Alert severity="info">
          No public files found. {searchQuery && 'Try adjusting your search terms.'}
        </Alert>
      ) : (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 2,
            }}
          >
            {files.map((file) => (
              <Card
                key={file.id}
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  },
                }}
                onClick={() => handlePreview(file)}
              >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {getFileIcon(file.mime_type)}
                      <Typography
                        variant="subtitle1"
                        sx={{
                          ml: 1,
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                      >
                        {file.original_filename}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.75rem' }}>
                        {file.owner.username.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                        {file.owner.username}
                      </Typography>
                      {file.owner.role === 'admin' && (
                        <Chip
                          icon={<AdminPanelSettings />}
                          label="Admin"
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Chip
                        label={file.mime_type.split('/')[1]}
                        size="small"
                        color={getFileTypeColor(file.mime_type) as any}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {formatFileSize(file.size)}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        {file.share_count} downloads
                      </Typography>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(file);
                          }}
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(file);
                          }}
                        >
                          <Download />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
            ))}
          </Box>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={pagination.total_pages}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* File Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedFile && getFileIcon(selectedFile.mime_type)}
            File Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedFile && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedFile.original_filename}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Size:</strong> {formatFileSize(selectedFile.size)}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Type:</strong> {selectedFile.mime_type}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Uploaded by:</strong> {selectedFile.owner.username}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Downloads:</strong> {selectedFile.share_count}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Uploaded on:</strong> {new Date(selectedFile.created_at).toLocaleDateString()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          {selectedFile && (
            <Button
              variant="contained"
              startIcon={<Download />}
              onClick={() => {
                handleDownload(selectedFile);
                setPreviewOpen(false);
              }}
            >
              Download
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};