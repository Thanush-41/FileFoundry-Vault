import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Download,
  Delete,
  FilePresent,
  PictureAsPdf,
  Image,
  VideoFile,
  AudioFile,
  Description,
  Visibility,
  DriveFileMove,
  Folder as FolderIcon,
  Home,
  ChevronRight,
  Share,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { FilePreview } from './FilePreview';
import { SharingModal } from './SharingModal';
import { FolderSharingModal } from './FolderSharingModal';

interface File {
  id: string;
  filename: string;
  original_filename: string;
  mime_type: string;
  size: number;
  createdAt: string;
  tags?: string[];
  description?: string;
}

interface Folder {
  id: string;
  name: string;
  path: string;
  parent_id?: string;
  owner_id: string;
  createdAt: string;
  updatedAt?: string;
}

interface FileListProps {
  onFileDeleted?: () => void;
  refreshTrigger?: number;
  viewMode?: 'grid' | 'list';
}

export const FileList: React.FC<FileListProps> = ({ onFileDeleted, refreshTrigger, viewMode = 'list' }) => {
  const { token } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<File | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [folderDeleteDialogOpen, setFolderDeleteDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [fileToMove, setFileToMove] = useState<File | null>(null);
  const [folderMoveDialogOpen, setFolderMoveDialogOpen] = useState(false);
  const [folderToMove, setFolderToMove] = useState<Folder | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [moving, setMoving] = useState(false);
  const [movingFolder, setMovingFolder] = useState(false);
  
  // Sharing state
  const [sharingModalOpen, setSharingModalOpen] = useState(false);
  const [fileToShare, setFileToShare] = useState<File | null>(null);
  const [folderSharingModalOpen, setFolderSharingModalOpen] = useState(false);
  const [folderToShare, setFolderToShare] = useState<Folder | null>(null);
  
  // Navigation state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolders, setCurrentFolders] = useState<Folder[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Folder[]>([]);

  useEffect(() => {
    fetchFoldersAndFiles();
  }, [token, refreshTrigger, currentFolderId]);

  const fetchFoldersAndFiles = async () => {
    if (!token) {
      setError('No authentication token available');
      setLoading(false);
      return;
    }

    try {
      console.log('📁 Fetching folders and files for folder:', currentFolderId || 'root');
      setLoading(true);
      setError(null);

      // Fetch folders for current directory
      const foldersUrl = currentFolderId 
        ? `${process.env.REACT_APP_API_URL}/api/v1/folders/?parent_id=${currentFolderId}`
        : `${process.env.REACT_APP_API_URL}/api/v1/folders/?parent_id=root`;
      
      const foldersResponse = await fetch(foldersUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Fetch files for current directory
      const filesUrl = currentFolderId 
        ? `${process.env.REACT_APP_API_URL}/api/v1/files/?folder_id=${currentFolderId}`
        : `${process.env.REACT_APP_API_URL}/api/v1/files/?folder_id=root`;
      
      const filesResponse = await fetch(filesUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (foldersResponse.ok && filesResponse.ok) {
        const foldersData = await foldersResponse.json();
        const filesData = await filesResponse.json();
        
        console.log('✅ Folders fetched successfully:', foldersData);
        console.log('✅ Files fetched successfully:', filesData);
        
        setCurrentFolders(foldersData.folders || []);
        setFiles(filesData.files || []);
        
        // Update breadcrumbs if we're in a specific folder
        if (currentFolderId) {
          updateBreadcrumbs(currentFolderId);
        } else {
          setBreadcrumbs([]);
        }
      } else {
        const foldersError = await foldersResponse.json().catch(() => ({ error: 'Unknown folder error' }));
        const filesError = await filesResponse.json().catch(() => ({ error: 'Unknown file error' }));
        
        // Check for rate limiting errors
        const rateLimitError = foldersError.code === 'RATE_LIMIT_ERROR' ? foldersError : 
                              filesError.code === 'RATE_LIMIT_ERROR' ? filesError : null;
        
        if (rateLimitError) {
          const retryAfter = rateLimitError.retry_after || 1;
          alert(`⚠️ Rate limit exceeded. Please wait ${retryAfter} second(s) before trying again.\n\n${rateLimitError.message || 'Too many requests.'}`);
          setError(`Rate limit exceeded - please wait ${retryAfter}s`);
        } else {
          setError(`Failed to fetch data: ${foldersError.error || filesError.error}`);
        }
        console.error('❌ Failed to fetch data:', foldersError, filesError);
      }
    } catch (error) {
      console.error('❌ Error fetching folders and files:', error);
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const updateBreadcrumbs = async (folderId: string) => {
    if (!token) return;
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/folders/${folderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const folder = data.folder;
        console.log('📂 Current folder:', folder);
        
        // Build breadcrumb trail
        const crumbs = [];
        let current = folder;
        while (current) {
          crumbs.unshift(current);
          current = current.parent;
        }
        setBreadcrumbs(crumbs);
      }
    } catch (error) {
      console.error('❌ Error fetching folder details:', error);
    }
  };

  const refreshFiles = () => {
    fetchFoldersAndFiles();
  };

  // Fetch folders for move dialog
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

  // Handle move file to folder
  const handleMoveFile = async () => {
    if (!fileToMove || !token) return;

    try {
      setMoving(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/files/${fileToMove.id}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          folder_id: selectedFolderId || null,
        }),
      });

      if (response.ok) {
        setMoveDialogOpen(false);
        refreshFiles(); // Refresh the file list
        if (onFileDeleted) onFileDeleted(); // Notify parent component
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to move file');
      }
    } catch (error) {
      console.error('Error moving file:', error);
      setError('Error moving file');
    } finally {
      setMoving(false);
    }
  };

  const openMoveDialog = (file: File) => {
    setFileToMove(file);
    setSelectedFolderId('');
    setMoveDialogOpen(true);
    fetchFolders();
  };

  const closeMoveDialog = () => {
    setMoveDialogOpen(false);
    setFileToMove(null);
    setSelectedFolderId('');
  };

  // Handle move folder to different parent
  const handleMoveFolder = async () => {
    if (!folderToMove || !token) return;

    try {
      setMovingFolder(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/folders/${folderToMove.id}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          parent_id: selectedFolderId || null,
        }),
      });

      if (response.ok) {
        setFolderMoveDialogOpen(false);
        refreshFiles(); // Refresh the file list
        if (onFileDeleted) onFileDeleted(); // Notify parent component
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to move folder');
      }
    } catch (error) {
      console.error('Error moving folder:', error);
      setError('Error moving folder');
    } finally {
      setMovingFolder(false);
    }
  };

  const openFolderMoveDialog = (folder: Folder) => {
    setFolderToMove(folder);
    setSelectedFolderId('');
    setFolderMoveDialogOpen(true);
    fetchFolders();
  };

  const closeFolderMoveDialog = () => {
    setFolderMoveDialogOpen(false);
    setFolderToMove(null);
    setSelectedFolderId('');
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    if (!dateString) {
      return 'Unknown';
    }
    
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image color="primary" />;
    if (mimeType === 'application/pdf') return <PictureAsPdf color="error" />;
    if (mimeType.startsWith('video/')) return <VideoFile color="secondary" />;
    if (mimeType.startsWith('audio/')) return <AudioFile color="info" />;
    if (mimeType.startsWith('text/')) return <Description color="action" />;
    return <FilePresent color="action" />;
  };

  // Navigation functions
  const handleFolderClick = (folderId: string) => {
    console.log('📂 Navigating to folder:', folderId);
    setCurrentFolderId(folderId);
  };

  const handleNavigateToRoot = () => {
    console.log('🏠 Navigating to root');
    setCurrentFolderId(null);
  };

  // const handleBreadcrumbClick = (folderId: string | null) => {
  //   console.log('🍞 Breadcrumb navigation to:', folderId || 'root');
  //   setCurrentFolderId(folderId);
  // };

  const handleBreadcrumbClick = (folderId: string | null) => {
    console.log('🍞 Breadcrumb navigation to:', folderId || 'root');
    setCurrentFolderId(folderId);
  };

  const handleDownload = async (file: File) => {
    try {
      console.log('📥 Downloading file:', file.filename);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/files/${file.id}/view`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

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
        console.log('✅ File downloaded successfully');
      } else {
        console.error('❌ Failed to download file:', response.status);
        setError('Failed to download file');
      }
    } catch (error) {
      console.error('❌ Error downloading file:', error);
      setError('Error downloading file');
    }
  };

  const handlePreview = (file: File) => {
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewFile(null);
  };

  const handleDeleteClick = (file: File) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete || !token) return;

    try {
      console.log('🗑️ Deleting file:', fileToDelete.filename);
      setDeleting(true);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/files/${fileToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        console.log('✅ File deleted successfully');
        setFiles(files.filter(f => f.id !== fileToDelete.id));
        setDeleteDialogOpen(false);
        setFileToDelete(null);
        if (onFileDeleted) {
          onFileDeleted();
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Failed to delete file:', response.status, errorData);
        setError(`Failed to delete file: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error deleting file:', error);
      setError(`Error deleting file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleFolderDeleteClick = (folder: Folder) => {
    setFolderToDelete(folder);
    setFolderDeleteDialogOpen(true);
  };

  const handleFolderDeleteConfirm = async () => {
    if (!folderToDelete || !token) return;

    try {
      console.log('🗑️ Deleting folder:', folderToDelete.name);
      setDeletingFolder(true);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/folders/${folderToDelete.id}?force=true`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        console.log('✅ Folder deleted successfully');
        setCurrentFolders(currentFolders.filter(f => f.id !== folderToDelete.id));
        setFolderDeleteDialogOpen(false);
        setFolderToDelete(null);
        if (onFileDeleted) {
          onFileDeleted();
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Failed to delete folder:', response.status, errorData);
        setError(`Failed to delete folder: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error deleting folder:', error);
      setError(`Error deleting folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeletingFolder(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading files...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
        <Button onClick={refreshFiles} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (files.length === 0 && currentFolders.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <FilePresent sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {currentFolderId ? 'This folder is empty' : 'No files uploaded yet'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {currentFolderId ? 'Upload files or create folders to get started!' : 'Upload your first file to get started!'}
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Breadcrumb Navigation */}
      {(currentFolderId || breadcrumbs.length > 0) && (
        <Box sx={{ mb: 2 }}>
          <Breadcrumbs separator={<ChevronRight fontSize="small" />}>
            <Link
              component="button"
              variant="body2"
              onClick={() => handleBreadcrumbClick(null)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                textDecoration: 'none',
                color: 'primary.main',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              <Home sx={{ mr: 0.5 }} fontSize="inherit" />
              Root
            </Link>
            {breadcrumbs.map((folder, index) => (
              <Link
                key={folder.id}
                component="button"
                variant="body2"
                onClick={() => handleBreadcrumbClick(folder.id)}
                sx={{
                  textDecoration: 'none',
                  color: index === breadcrumbs.length - 1 ? 'text.primary' : 'primary.main',
                  '&:hover': { textDecoration: index === breadcrumbs.length - 1 ? 'none' : 'underline' }
                }}
              >
                {folder.name}
              </Link>
            ))}
          </Breadcrumbs>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {currentFolders.length + files.length} item{currentFolders.length + files.length !== 1 ? 's' : ''} ({currentFolders.length} folder{currentFolders.length !== 1 ? 's' : ''}, {files.length} file{files.length !== 1 ? 's' : ''})
        </Typography>
        <Button variant="outlined" size="small" onClick={refreshFiles}>
          Refresh
        </Button>
      </Box>

{viewMode === 'list' ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>File</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Uploaded</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Folders */}
              {currentFolders.map((folder) => (
                <TableRow 
                  key={`folder-${folder.id}`} 
                  hover 
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleFolderClick(folder.id)}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FolderIcon color="primary" />
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {folder.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Folder
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      —
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label="FOLDER" 
                      size="small" 
                      variant="outlined"
                      color="primary"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(folder.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Share Folder">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolderToShare(folder);
                            setFolderSharingModalOpen(true);
                          }}
                          color="default"
                        >
                          <Share fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Open Folder">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFolderClick(folder.id);
                          }}
                          color="primary"
                        >
                          <FolderIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Move Folder">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            openFolderMoveDialog(folder);
                          }}
                          color="secondary"
                        >
                          <DriveFileMove fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Folder">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFolderDeleteClick(folder);
                          }}
                          color="error"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Files */}
              {files.map((file) => (
                <TableRow key={`file-${file.id}`} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getFileIcon(file.mime_type)}
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {file.original_filename}
                        </Typography>
                        {file.description && (
                          <Typography variant="caption" color="text.secondary">
                            {file.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatBytes(file.size)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={file.mime_type.split('/')[1].toUpperCase()} 
                      size="small" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(file.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="View">
                        <IconButton
                          size="small"
                          onClick={() => handlePreview(file)}
                          color="secondary"
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Share">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setFileToShare(file);
                            setSharingModalOpen(true);
                          }}
                          color="info"
                        >
                          <Share fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download">
                        <IconButton
                          size="small"
                          onClick={() => handleDownload(file)}
                          color="primary"
                        >
                          <Download fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Move to Folder">
                        <IconButton
                          size="small"
                          onClick={() => openMoveDialog(file)}
                          color="secondary"
                        >
                          <DriveFileMove fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(file)}
                          color="error"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        /* Grid View */
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { 
            xs: '1fr', 
            sm: 'repeat(2, 1fr)', 
            md: 'repeat(3, 1fr)', 
            lg: 'repeat(4, 1fr)', 
            xl: 'repeat(5, 1fr)' 
          }, 
          gap: 2 
        }}>
          {/* Folders in Grid */}
          {currentFolders.map((folder) => (
            <Paper
              key={`folder-${folder.id}`}
              sx={{
                p: 2,
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                  borderColor: 'primary.main',
                },
              }}
              onClick={() => handleFolderClick(folder.id)}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <FolderIcon color="primary" sx={{ fontSize: 40, mr: 1 }} />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography 
                      variant="subtitle2" 
                      fontWeight="medium"
                      noWrap
                      title={folder.name}
                    >
                      {folder.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Folder
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                  {formatDate(folder.createdAt)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 'auto' }}>
                  <Tooltip title="Share Folder">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFolderToShare(folder);
                        setFolderSharingModalOpen(true);
                      }}
                      color="default"
                    >
                      <Share fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Move Folder">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        openFolderMoveDialog(folder);
                      }}
                      color="secondary"
                    >
                      <DriveFileMove fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Folder">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFolderDeleteClick(folder);
                      }}
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Paper>
          ))}

          {/* Files in Grid */}
          {files.map((file) => (
            <Paper
              key={`file-${file.id}`}
              sx={{
                p: 2,
                transition: 'all 0.2s',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                  borderColor: 'primary.main',
                },
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {getFileIcon(file.mime_type)}
                  <Box sx={{ flexGrow: 1, minWidth: 0, ml: 1 }}>
                    <Typography 
                      variant="subtitle2" 
                      fontWeight="medium"
                      noWrap
                      title={file.original_filename}
                    >
                      {file.original_filename}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatBytes(file.size)}
                    </Typography>
                  </Box>
                </Box>
                
                {file.description && (
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ 
                      mb: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {file.description}
                  </Typography>
                )}
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Chip 
                    label={file.mime_type.split('/')[1].toUpperCase()} 
                    size="small" 
                    variant="outlined"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(file.createdAt)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 0.5, mt: 'auto', flexWrap: 'wrap' }}>
                  <Tooltip title="View">
                    <IconButton
                      size="small"
                      onClick={() => handlePreview(file)}
                      color="secondary"
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Share">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setFileToShare(file);
                        setSharingModalOpen(true);
                      }}
                      color="info"
                    >
                      <Share fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download">
                    <IconButton
                      size="small"
                      onClick={() => handleDownload(file)}
                      color="primary"
                    >
                      <Download fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Move">
                    <IconButton
                      size="small"
                      onClick={() => openMoveDialog(file)}
                      color="secondary"
                    >
                      <DriveFileMove fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteClick(file)}
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => !deleting && setDeleteDialogOpen(false)}>
        <DialogTitle>Delete File</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{fileToDelete?.original_filename}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : undefined}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Folder Delete Confirmation Dialog */}
      <Dialog 
        open={folderDeleteDialogOpen} 
        onClose={() => !deletingFolder && setFolderDeleteDialogOpen(false)}
        maxWidth="xs" 
        fullWidth
      >
        <DialogTitle>Delete Folder</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete the folder "{folderToDelete?.name}"?
          </Typography>
          <Typography variant="body2" color="warning.main" sx={{ mt: 1, fontWeight: 'medium' }}>
            This will permanently delete the folder and all its contents (subfolders and files).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFolderDeleteDialogOpen(false)} disabled={deletingFolder}>
            Cancel
          </Button>
          <Button 
            onClick={handleFolderDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={deletingFolder}
            startIcon={deletingFolder ? <CircularProgress size={16} /> : undefined}
          >
            {deletingFolder ? 'Deleting...' : 'Delete Folder'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Move File Dialog */}
      <Dialog open={moveDialogOpen} onClose={closeMoveDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Move File to Folder</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Move "{fileToMove?.original_filename}" to:
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Destination Folder</InputLabel>
            <Select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              label="Destination Folder"
              disabled={moving}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={closeMoveDialog} disabled={moving}>
            Cancel
          </Button>
          <Button 
            onClick={handleMoveFile} 
            color="primary" 
            variant="contained"
            disabled={moving}
            startIcon={moving ? <CircularProgress size={16} /> : undefined}
          >
            {moving ? 'Moving...' : 'Move'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Move Folder Dialog */}
      <Dialog open={folderMoveDialogOpen} onClose={closeFolderMoveDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Move Folder</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Move folder "{folderToMove?.name}" to:
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Destination Folder</InputLabel>
            <Select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              label="Destination Folder"
              disabled={movingFolder}
            >
              <MenuItem value="">
                <em>Root Directory</em>
              </MenuItem>
              {folders.filter(f => f.id !== folderToMove?.id).map((folder) => (
                <MenuItem key={folder.id} value={folder.id}>
                  {folder.path || folder.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeFolderMoveDialog} disabled={movingFolder}>
            Cancel
          </Button>
          <Button 
            onClick={handleMoveFolder} 
            color="primary" 
            variant="contained"
            disabled={movingFolder}
            startIcon={movingFolder ? <CircularProgress size={16} /> : undefined}
          >
            {movingFolder ? 'Moving...' : 'Move'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* File Preview Dialog */}
      <FilePreview
        file={previewFile}
        open={previewOpen}
        onClose={handleClosePreview}
        onDownload={handleDownload}
        token={token}
      />
      
      {/* Sharing Modal */}
      <SharingModal
        open={sharingModalOpen}
        onClose={() => setSharingModalOpen(false)}
        file={fileToShare}
      />

      {/* Folder Sharing Modal */}
      <FolderSharingModal
        open={folderSharingModalOpen}
        onClose={() => setFolderSharingModalOpen(false)}
        folder={folderToShare}
      />
    </Box>
  );
};