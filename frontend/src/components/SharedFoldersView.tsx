import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Divider,
} from '@mui/material';
import {
  FolderShared as FolderSharedIcon,
  Person as PersonIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Schedule as ScheduleIcon,
  FolderOpen as FolderOpenIcon,
  ChevronRight,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface SharedFolder {
  id: string;
  folder: {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
  };
  shared_by_user: {
    id: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
  permission: string;
  message?: string;
  createdAt: string;
  expiresAt?: string;
}

export const SharedFoldersView: React.FC = () => {
  const { token } = useAuth();
  const [sharedFolders, setSharedFolders] = useState<SharedFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingFolder, setViewingFolder] = useState<SharedFolder | null>(null);
  const [folderContents, setFolderContents] = useState<any[]>([]);
  const [loadingContents, setLoadingContents] = useState(false);

  useEffect(() => {
    fetchSharedFolders();
  }, [token]);

  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchSharedFolders = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔑 Token for shared folders:', token?.substring(0, 20) + '...');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/shared-folders`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📁 Shared folders data:', data);
      
      setSharedFolders(data.sharedFolders || []);
    } catch (error: any) {
      console.error('Error fetching shared folders:', error);
      setError(error.message || 'Failed to load shared folders');
    } finally {
      setLoading(false);
    }
  };

  const fetchFolderContents = async (folderId: string) => {
    if (!token) return;
    
    setLoadingContents(true);
    try {
      // Fetch both folders and files in the shared folder
      const [foldersResponse, filesResponse] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL}/api/v1/folders/?parent_id=${folderId}`, {
          headers: getAuthHeaders()
        }),
        fetch(`${process.env.REACT_APP_API_URL}/api/v1/files/?folder_id=${folderId}`, {
          headers: getAuthHeaders()
        })
      ]);

      const foldersData = foldersResponse.ok ? await foldersResponse.json() : { folders: [] };
      const filesData = filesResponse.ok ? await filesResponse.json() : { files: [] };
      
      // Combine folders and files
      const contents = [
        ...(foldersData.folders || []).map((folder: any) => ({ ...folder, type: 'folder' })),
        ...(filesData.files || []).map((file: any) => ({ ...file, type: 'file' }))
      ];
      
      setFolderContents(contents);
    } catch (error) {
      console.error('Error fetching folder contents:', error);
      setError('Failed to load folder contents');
    } finally {
      setLoadingContents(false);
    }
  };

  const handleViewFolder = (sharedFolder: SharedFolder) => {
    setViewingFolder(sharedFolder);
    fetchFolderContents(sharedFolder.folder.id);
  };

  const handleBackToList = () => {
    setViewingFolder(null);
    setFolderContents([]);
  };

  const handleViewFile = async (file: any) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/files/${file.id}/view`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Failed to view file');
        setError('Failed to view file');
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      setError('Error viewing file');
    }
  };

  const handleDownloadFile = async (file: any) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/files/${file.id}/view`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.original_filename || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Failed to download file');
        setError('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Error downloading file');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'download':
        return 'success';
      case 'view':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'download':
        return <DownloadIcon />;
      case 'view':
        return <VisibilityIcon />;
      default:
        return <PersonIcon />;
    }
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getUserDisplayName = (user: any) => {
    if (!user) return 'Unknown User';
    
    // Try firstName + lastName first
    if (user.firstName) {
      return user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName;
    }
    
    // Fallback to username or email
    return user.username || user.email || 'Unknown User';
  };

  const getUserInitials = (user: any) => {
    if (!user) return 'U';
    
    if (user.firstName) {
      return user.lastName ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : user.firstName[0].toUpperCase();
    }
    
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    
    return 'U';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {viewingFolder ? (
        // Folder contents view
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={handleBackToList} sx={{ mr: 1 }}>
              <ChevronRight sx={{ transform: 'rotate(180deg)' }} />
            </IconButton>
            <FolderOpenIcon sx={{ mr: 1, fontSize: 32 }} />
            <Typography variant="h4" component="h1">
              {viewingFolder.folder.name}
            </Typography>
            <Chip 
              label={`Shared by ${getUserDisplayName(viewingFolder.shared_by_user)}`}
              size="small"
              sx={{ ml: 2 }}
            />
          </Box>

          {loadingContents ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              {folderContents.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    This folder is empty
                  </Typography>
                </Paper>
              ) : (
                <Paper>
                  <List>
                    {folderContents.map((item, index) => (
                      <React.Fragment key={`${item.type}-${item.id}`}>
                        <ListItem>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {item.type === 'folder' ? <FolderOpenIcon sx={{ mr: 1 }} /> : <FileIcon sx={{ mr: 1 }} />}
                                {item.name || item.original_filename}
                              </Box>
                            }
                            secondary={
                              item.type === 'file' 
                                ? `${(item.size / 1024 / 1024).toFixed(2)} MB • ${new Date(item.created_at).toLocaleDateString()}`
                                : `Folder • ${new Date(item.created_at).toLocaleDateString()}`
                            }
                          />
                          <ListItemSecondaryAction>
                            {item.type === 'file' && (
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Tooltip title="View">
                                  <IconButton onClick={() => handleViewFile(item)}>
                                    <VisibilityIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Download">
                                  <IconButton onClick={() => handleDownloadFile(item)}>
                                    <DownloadIcon />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            )}
                          </ListItemSecondaryAction>
                        </ListItem>
                        {index < folderContents.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </Paper>
              )}
            </Box>
          )}
        </Box>
      ) : (
        // Shared folders list view
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <FolderSharedIcon sx={{ mr: 1, fontSize: 32 }} />
            <Typography variant="h4" component="h1">
              Shared Folders
            </Typography>
          </Box>

          {sharedFolders.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <FolderSharedIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No folders shared with you
              </Typography>
              <Typography variant="body2" color="text.secondary">
                When other users share folders with you, they will appear here.
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
              {sharedFolders.map((sharedFolder) => (
                <Card
                  key={sharedFolder.id}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    opacity: isExpired(sharedFolder.expiresAt) ? 0.6 : 1,
                  }}
                >
                  {isExpired(sharedFolder.expiresAt) && (
                    <Chip
                      label="Expired"
                      color="error"
                      size="small"
                      sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
                    />
                  )}
                  
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <FolderOpenIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6" component="h2" noWrap>
                        {sharedFolder.folder.name}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.75rem' }}>
                          {getUserInitials(sharedFolder.shared_by_user)}
                        </Avatar>
                        <Typography variant="body2" color="text.secondary">
                          Shared by: {getUserDisplayName(sharedFolder.shared_by_user)}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Chip
                          icon={getPermissionIcon(sharedFolder.permission)}
                          label={sharedFolder.permission === 'download' ? 'View & Download' : 'View Only'}
                          color={getPermissionColor(sharedFolder.permission) as any}
                          size="small"
                          variant="outlined"
                        />
                      </Box>

                      <Typography variant="caption" color="text.secondary" display="flex" alignItems="center">
                        <ScheduleIcon sx={{ fontSize: 16, mr: 0.5 }} />
                        Shared: {formatDate(sharedFolder.createdAt)}
                      </Typography>

                      {sharedFolder.expiresAt && (
                        <Typography
                          variant="caption"
                          color={isExpired(sharedFolder.expiresAt) ? 'error' : 'text.secondary'}
                          display="flex"
                          alignItems="center"
                          sx={{ mt: 0.5 }}
                        >
                          <ScheduleIcon sx={{ fontSize: 16, mr: 0.5 }} />
                          Expires: {formatDate(sharedFolder.expiresAt)}
                        </Typography>
                      )}
                    </Box>

                    {sharedFolder.message && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Message:
                        </Typography>
                        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                          "{sharedFolder.message}"
                        </Typography>
                      </Box>
                    )}
                  </CardContent>

                  <Divider />
                  
                  <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <Tooltip title="Open Folder">
                      <IconButton
                        color="primary"
                        disabled={isExpired(sharedFolder.expiresAt)}
                        onClick={() => handleViewFolder(sharedFolder)}
                      >
                        <FolderOpenIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Card>
              ))}
            </Box>
          )}

          {/* Summary Statistics */}
          <Paper sx={{ mt: 4, p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Summary
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
              <Box>
                <Typography variant="h4" color="primary">
                  {sharedFolders.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Shared
                </Typography>
              </Box>
              <Box>
                <Typography variant="h4" color="success.main">
                  {sharedFolders.filter(f => f.permission === 'download').length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  With Download
                </Typography>
              </Box>
              <Box>
                <Typography variant="h4" color="warning.main">
                  {sharedFolders.filter(f => f.expiresAt && !isExpired(f.expiresAt)).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expiring Soon
                </Typography>
              </Box>
              <Box>
                <Typography variant="h4" color="error.main">
                  {sharedFolders.filter(f => isExpired(f.expiresAt)).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expired
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
};