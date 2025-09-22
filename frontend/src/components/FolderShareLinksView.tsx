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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import {
  Link as LinkIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Schedule as ScheduleIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface FolderShareLink {
  id: string;
  folderId: string;
  folderName: string;
  shareToken: string;
  permission: string;
  passwordHash?: string;
  createdAt: string;
  expiresAt?: string;
  lastAccessedAt?: string;
  isActive: boolean;
}

export const FolderShareLinksView: React.FC = () => {
  const { token } = useAuth();
  const [shareLinks, setShareLinks] = useState<FolderShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Create link dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [permission, setPermission] = useState('view');
  const [expiresAt, setExpiresAt] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchShareLinks();
    fetchFolders();
  }, [token]);

  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchShareLinks = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/folder-share-links`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('🔗 Share links data:', data);
      
      setShareLinks(data.shareLinks || []);
    } catch (error: any) {
      console.error('Error fetching share links:', error);
      setError(error.message || 'Failed to load share links');
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/folders/`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const createShareLink = async () => {
    if (!selectedFolderId) {
      setAlert({ type: 'error', message: 'Please select a folder' });
      return;
    }

    setCreating(true);
    try {
      const requestBody: any = {
        folderId: selectedFolderId,
        permission
      };

      if (expiresAt) {
        requestBody.expiresAt = new Date(expiresAt).toISOString();
      }

      if (usePassword && linkPassword.trim()) {
        requestBody.password = linkPassword.trim();
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/folders/${selectedFolderId}/share-link`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        setAlert({ type: 'success', message: 'Share link created successfully!' });
        setCreateDialogOpen(false);
        resetCreateForm();
        fetchShareLinks();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error creating share link');
      }
    } catch (error: any) {
      setAlert({ type: 'error', message: error.message || 'Error creating share link' });
    } finally {
      setCreating(false);
    }
  };

  const revokeShareLink = async (linkId: string) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/folder-share-links/${linkId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setAlert({ type: 'success', message: 'Share link revoked successfully!' });
        fetchShareLinks();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error revoking share link');
      }
    } catch (error: any) {
      setAlert({ type: 'error', message: error.message || 'Error revoking share link' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setAlert({ type: 'success', message: 'Link copied to clipboard!' });
    }).catch(() => {
      setAlert({ type: 'error', message: 'Failed to copy link' });
    });
  };

  const resetCreateForm = () => {
    setSelectedFolderId('');
    setPermission('view');
    setExpiresAt('');
    setLinkPassword('');
    setUsePassword(false);
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

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'download':
        return <DownloadIcon />;
      case 'view':
        return <VisibilityIcon />;
      default:
        return <VisibilityIcon />;
    }
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

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <LinkIcon sx={{ mr: 1, fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            Folder Share Links
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Link
        </Button>
      </Box>

      {alert && (
        <Alert severity={alert.type} sx={{ mb: 2 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {shareLinks.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <LinkIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No share links created
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Create shareable links to give external users access to your folders.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Your First Link
          </Button>
        </Paper>
      ) : (
        <Box>
          <List>
            {shareLinks.map((link, index) => (
              <React.Fragment key={link.id}>
                <ListItem
                  sx={{
                    opacity: isExpired(link.expiresAt) ? 0.6 : 1,
                    bgcolor: isExpired(link.expiresAt) ? 'action.hover' : 'transparent',
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="subtitle1" component="div">
                          {link.folderName || `Folder ${link.folderId}`}
                        </Typography>
                        {isExpired(link.expiresAt) && (
                          <Chip label="Expired" color="error" size="small" />
                        )}
                        {link.passwordHash && (
                          <Chip
                            icon={<SecurityIcon />}
                            label="Protected"
                            color="primary"
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography
                            variant="body2"
                            component="code"
                            sx={{
                              bgcolor: 'action.hover',
                              p: 0.5,
                              borderRadius: 1,
                              fontFamily: 'monospace',
                              fontSize: '0.875rem',
                              wordBreak: 'break-all',
                              flex: 1,
                            }}
                          >
                            {`${window.location.origin}/folder-share/${link.shareToken}`}
                          </Typography>
                          <Tooltip title="Copy Link">
                            <IconButton
                              size="small"
                              onClick={() =>
                                copyToClipboard(`${window.location.origin}/folder-share/${link.shareToken}`)
                              }
                            >
                              <CopyIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                          <Chip
                            icon={getPermissionIcon(link.permission)}
                            label={link.permission === 'download' ? 'View & Download' : 'View Only'}
                            color={getPermissionColor(link.permission) as any}
                            size="small"
                            variant="outlined"
                          />
                        </Box>

                        <Typography variant="caption" color="text.secondary" display="flex" alignItems="center">
                          <ScheduleIcon sx={{ fontSize: 16, mr: 0.5 }} />
                          Created: {formatDate(link.createdAt)}
                        </Typography>

                        {link.expiresAt && (
                          <Typography
                            variant="caption"
                            color={isExpired(link.expiresAt) ? 'error' : 'text.secondary'}
                            display="flex"
                            alignItems="center"
                            sx={{ mt: 0.5 }}
                          >
                            <ScheduleIcon sx={{ fontSize: 16, mr: 0.5 }} />
                            Expires: {formatDate(link.expiresAt)}
                          </Typography>
                        )}

                        {link.lastAccessedAt && (
                          <Typography variant="caption" color="text.secondary" display="flex" alignItems="center" sx={{ mt: 0.5 }}>
                            <ScheduleIcon sx={{ fontSize: 16, mr: 0.5 }} />
                            Last accessed: {formatDate(link.lastAccessedAt)}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Tooltip title="Revoke Link">
                      <IconButton
                        edge="end"
                        onClick={() => revokeShareLink(link.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < shareLinks.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>

          {/* Summary Statistics */}
          <Paper sx={{ mt: 4, p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Summary
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 2 }}>
              <Box>
                <Typography variant="h4" color="primary">
                  {shareLinks.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Links
                </Typography>
              </Box>
              <Box>
                <Typography variant="h4" color="success.main">
                  {shareLinks.filter(l => !isExpired(l.expiresAt)).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active
                </Typography>
              </Box>
              <Box>
                <Typography variant="h4" color="warning.main">
                  {shareLinks.filter(l => l.passwordHash).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Protected
                </Typography>
              </Box>
              <Box>
                <Typography variant="h4" color="error.main">
                  {shareLinks.filter(l => isExpired(l.expiresAt)).length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expired
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Create Share Link Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Folder Share Link</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Select Folder</InputLabel>
              <Select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                label="Select Folder"
              >
                {folders.map((folder) => (
                  <MenuItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Permission</InputLabel>
              <Select
                value={permission}
                onChange={(e) => setPermission(e.target.value)}
                label="Permission"
              >
                <MenuItem value="view">View Only</MenuItem>
                <MenuItem value="download">View & Download</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Expiration Date (Optional)"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={usePassword}
                  onChange={(e) => setUsePassword(e.target.checked)}
                />
              }
              label="Password Protection"
            />

            {usePassword && (
              <TextField
                label="Password"
                type="password"
                value={linkPassword}
                onChange={(e) => setLinkPassword(e.target.value)}
                fullWidth
                placeholder="Enter password for the link"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={createShareLink}
            variant="contained"
            disabled={creating || !selectedFolderId}
            startIcon={creating ? <CircularProgress size={20} /> : <LinkIcon />}
          >
            {creating ? 'Creating...' : 'Create Link'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};