import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import { CloudUpload, Public, Lock, CheckCircle, Error as ErrorIcon, Upload } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface FileUploadProgress {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'waiting' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface Folder {
  id: string;
  name: string;
  path: string;
}

interface FileUploadProps {
  onUploadComplete?: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete }) => {
  const { user, token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [fileProgresses, setFileProgresses] = useState<FileUploadProgress[]>([]);

  // Fetch folders on component mount
  useEffect(() => {
    const fetchFolders = async () => {
      if (!token) return;

      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/folders/`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setFolders(data.folders || []);
        }
      } catch (error) {
        console.error('Error fetching folders:', error);
      }
    };

    fetchFolders();
  }, [token]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const fileArr = Array.from(files);
    setSelectedFiles(fileArr);
    await uploadFiles(fileArr);
  };

  // Drag and drop handlers
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const files = event.dataTransfer.files;
    if (!files || files.length === 0) return;
    const fileArr = Array.from(files);
    setSelectedFiles(fileArr);
    await uploadFiles(fileArr);
  };

  const uploadFiles = async (files: File[]) => {
    if (!token) {
      setError('No authentication token found. Please log in again.');
      return;
    }

    // Client-side file size validation (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    
    if (oversizedFiles.length > 0) {
      const oversizedFileNames = oversizedFiles.map(f => f.name).join(', ');
      const fileSize = (oversizedFiles[0].size / (1024 * 1024)).toFixed(1);
      alert(`📁 File too large!\n\n${oversizedFiles.length > 1 ? 'Files' : 'File'} "${oversizedFileNames}" ${oversizedFiles.length > 1 ? 'are' : 'is'} ${fileSize}MB, which exceeds the maximum allowed size of 10.0MB per file.\n\nPlease choose smaller files.`);
      setError(`File size limit exceeded: ${oversizedFileNames}`);
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);
    
    // Initialize progress tracking for each file
    const initialProgresses: FileUploadProgress[] = files.map((file, index) => ({
      id: `${index}-${file.name}`,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'waiting',
    }));
    setFileProgresses(initialProgresses);

    let successCount = 0;
    let failCount = 0;
    let duplicateCount = 0;
    let totalSaved = 0;
    
    // Upload files concurrently with individual progress tracking
    const uploadPromises = files.map(async (file, index) => {
      const progressId = `${index}-${file.name}`;
      
      try {
        // Update status to uploading
        setFileProgresses(prev => 
          prev.map(fp => fp.id === progressId ? { ...fp, status: 'uploading' } : fp)
        );

        const formData = new FormData();
        formData.append('file', file);
        if (selectedFolderId) {
          formData.append('folder_id', selectedFolderId);
        }
        formData.append('is_public', isPublic.toString());

        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/api/v1/files/upload`,
          formData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                
                // Update individual file progress
                setFileProgresses(prev => 
                  prev.map(fp => fp.id === progressId ? { ...fp, progress: percentCompleted } : fp)
                );
                
                // Update overall progress
                const totalFiles = files.length;
                const currentFileIndex = index;
                const overallProgress = ((currentFileIndex + (percentCompleted / 100)) / totalFiles) * 100;
                setUploadProgress(overallProgress);
              }
            },
          }
        );

        if (response.status === 200 || response.status === 201) {
          const result = response.data;
          successCount++;
          
          // Update status to completed
          setFileProgresses(prev => 
            prev.map(fp => fp.id === progressId ? { ...fp, status: 'completed', progress: 100 } : fp)
          );
          
          // Check for deduplication information
          if (result.results && Array.isArray(result.results)) {
            result.results.forEach((fileResult: any) => {
              if (fileResult.is_duplicate) {
                duplicateCount++;
              }
              if (fileResult.saved_bytes) {
                totalSaved += fileResult.saved_bytes;
              }
            });
          }
          
          return { success: true, file: file.name };
        } else {
          throw new Error(`Upload failed with status ${response.status}`);
        }
      } catch (error: any) {
        failCount++;
        
        // Update status to error
        const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
        setFileProgresses(prev => 
          prev.map(fp => fp.id === progressId ? { 
            ...fp, 
            status: 'error', 
            error: errorMessage 
          } : fp)
        );

        // Handle different error types with specific messages
        if (error.response) {
          const { status, data } = error.response;
          
          if (status === 429 && data.code === 'RATE_LIMIT_ERROR') {
            const retryAfter = data.retry_after || 1;
            console.warn(`Rate limit exceeded for ${file.name}. Retry after ${retryAfter}s`);
          } else if (status === 403 && data.code === 'STORAGE_QUOTA_EXCEEDED') {
            console.error(`Storage quota exceeded for ${file.name}`);
          } else if (status === 413 && data.code === 'FILE_SIZE_EXCEEDED') {
            const fileSize = data.file_size ? (data.file_size / (1024 * 1024)).toFixed(1) : 'Unknown';
            const maxSize = data.max_file_size ? (data.max_file_size / (1024 * 1024)).toFixed(1) : '10.0';
            console.error(`File ${file.name} is too large: ${fileSize}MB (max: ${maxSize}MB)`);
          }
        }
        
        return { success: false, file: file.name, error: errorMessage };
      }
    });

    // Wait for all uploads to complete
    await Promise.allSettled(uploadPromises);
    
    // Enhanced success message with deduplication info
    let successMessage = `${successCount} file(s) uploaded successfully!`;
    if (duplicateCount > 0) {
      successMessage += ` ${duplicateCount} duplicate(s) detected - saved ${formatBytes(totalSaved)} storage space! 💾`;
    }
    
    setSuccess(successMessage);
    if (failCount > 0) setError(`${failCount} file(s) failed to upload.`);
    setUploadProgress(100);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onUploadComplete?.();
    setUploading(false);
    
    // Clear messages and progress after delay
    setTimeout(() => {
      setUploadProgress(0);
      setError(null);
      setSuccess(null);
      setFileProgresses([]);
      setSelectedFiles([]);
    }, 5000);
  };

  // Helper function to format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ textAlign: 'center' }}>
          <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Upload Files
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Drag and drop files below or select files to upload to your vault
          </Typography>

          {/* Folder Selection */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Upload to Folder (Optional)</InputLabel>
            <Select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              label="Upload to Folder (Optional)"
              disabled={uploading}
            >
              <MenuItem value="">
                <em>Root Directory</em>
              </MenuItem>
              {folders.map((folder) => (
                <MenuItem key={folder.id} value={folder.id}>
                  {folder.path || folder.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Public/Private Toggle */}
          <Box sx={{ mb: 2, p: 2, border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              {isPublic ? <Public /> : <Lock />}
              File Visibility
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  disabled={uploading}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {isPublic ? 'Public' : 'Private'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isPublic 
                      ? 'Anyone with the link can access this file' 
                      : 'Only you can access this file'
                    }
                  </Typography>
                </Box>
              }
              sx={{ margin: 0 }}
            />
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Drag and Drop Area */}
          <Box
            sx={{
              border: dragActive ? '2px solid #1976d2' : '2px dashed #aaa',
              borderRadius: 2,
              p: 4,
              mb: 2,
              background: dragActive ? '#e3f2fd' : 'transparent',
              cursor: uploading ? 'not-allowed' : 'pointer',
              transition: 'border 0.2s, background 0.2s',
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={!uploading ? handleFileSelect : undefined}
          >
            <Typography variant="body2" color="text.secondary">
              {dragActive ? 'Drop files here...' : 'Drag and drop files here or click to select'}
            </Typography>
          </Box>

          <Button
            variant="contained"
            onClick={handleFileSelect}
            disabled={uploading}
            startIcon={<CloudUpload />}
            sx={{ mb: 2 }}
          >
            {uploading ? 'Uploading...' : 'Choose Files'}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept={process.env.REACT_APP_ALLOWED_FILE_TYPES}
            multiple
          />

          {selectedFiles.length > 0 && !uploading && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Selected files ({selectedFiles.length}):
              </Typography>
              <Box sx={{ mt: 1, textAlign: 'left', maxWidth: 400, margin: '0 auto' }}>
                {selectedFiles.map((file, idx) => (
                  <Typography key={idx} variant="body2" sx={{ fontSize: '0.875rem' }}>
                    • {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </Typography>
                ))}
              </Box>
            </Box>
          )}

          {uploading && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ mb: 2, fontWeight: 'medium' }}>
                Upload Progress ({Math.round(uploadProgress)}%)
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={uploadProgress}
                sx={{ height: 8, borderRadius: 4, mb: 2 }}
              />
              
              {/* Individual file progress */}
              {fileProgresses.length > 0 && (
                <Card variant="outlined" sx={{ mt: 2 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      File Progress:
                    </Typography>
                    <List dense>
                      {fileProgresses.map((fileProgress) => (
                        <ListItem key={fileProgress.id} sx={{ px: 0, py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {fileProgress.status === 'completed' && (
                              <CheckCircle color="success" fontSize="small" />
                            )}
                            {fileProgress.status === 'error' && (
                              <ErrorIcon color="error" fontSize="small" />
                            )}
                            {fileProgress.status === 'uploading' && (
                              <Upload color="primary" fontSize="small" />
                            )}
                            {fileProgress.status === 'waiting' && (
                              <Upload color="disabled" fontSize="small" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography variant="body2" noWrap>
                                {fileProgress.name}
                              </Typography>
                            }
                            secondary={
                              <Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={fileProgress.progress}
                                  sx={{ 
                                    height: 4, 
                                    borderRadius: 2, 
                                    my: 0.5,
                                    bgcolor: fileProgress.status === 'error' ? 'error.light' : undefined,
                                    '& .MuiLinearProgress-bar': {
                                      bgcolor: fileProgress.status === 'error' ? 'error.main' : 
                                               fileProgress.status === 'completed' ? 'success.main' : undefined
                                    }
                                  }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                  {fileProgress.status === 'completed' 
                                    ? 'Completed' 
                                    : fileProgress.status === 'error' 
                                    ? `Error: ${fileProgress.error}` 
                                    : fileProgress.status === 'uploading'
                                    ? `${fileProgress.progress}% - ${formatBytes(fileProgress.size)}`
                                    : 'Waiting...'}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {success}
            </Alert>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};