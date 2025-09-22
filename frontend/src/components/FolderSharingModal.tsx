import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Tabs,
  Tab,
  Alert,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
} from '@mui/material';
import {
  Share as ShareIcon,
  Link as LinkIcon,
  Person as PersonIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Email as EmailIcon,
  FolderShared as FolderSharedIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface FolderSharingModalProps {
  open: boolean;
  onClose: () => void;
  folder: {
    id: string;
    name: string;
    created_at?: string;
    updated_at?: string;
  } | null;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`folder-sharing-tabpanel-${index}`}
      aria-labelledby={`folder-sharing-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export const FolderSharingModal: React.FC<FolderSharingModalProps> = ({ open, onClose, folder }) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [permission, setPermission] = useState('view');
  const [expiresAt, setExpiresAt] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [folderShares, setFolderShares] = useState<any[]>([]);
  const [folderShareLinks, setFolderShareLinks] = useState<any[]>([]);

  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchFolderShares = useCallback(async () => {
    if (!folder || !token) return;
    console.log('🔑 Token for folder shares:', token?.substring(0, 20) + '...');
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/folders/${folder.id}/shares`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📁 Fetched folder shares:', data);
        setFolderShares(data.folderShares || []);
      } else {
        console.error('Failed to fetch folder shares:', response.status);
      }
    } catch (error) {
      console.error('Error fetching folder shares:', error);
    }
  }, [folder, token]);

  const fetchFolderShareLinks = useCallback(async () => {
    if (!folder || !token) return;
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/folder-share-links`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔗 Fetched folder share links:', data);
        // Filter links for current folder
        const folderLinks = data.shareLinks?.filter((link: any) => link.folderId === folder.id) || [];
        setFolderShareLinks(folderLinks);
      } else {
        console.error('Failed to fetch folder share links:', response.status);
      }
    } catch (error) {
      console.error('Error fetching folder share links:', error);
    }
  }, [folder, token]);

  useEffect(() => {
    if (open && folder) {
      setAlert(null);
      fetchFolderShares();
      fetchFolderShareLinks();
    }
  }, [open, folder, fetchFolderShares, fetchFolderShareLinks]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setAlert(null);
  };

  const resetForm = () => {
    setEmail('');
    setMessage('');
    setPermission('view');
    setExpiresAt('');
    setLinkPassword('');
    setUsePassword(false);
    setAlert(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const shareWithUser = async () => {
    if (!folder || !email.trim()) {
      setAlert({ type: 'error', message: 'Email is required' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/folders/${folder.id}/share`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          folderId: folder.id,
          sharedWithEmail: email.trim(),
          permission,
          message: message.trim() || undefined
        })
      });

      if (response.ok) {
        setAlert({ type: 'success', message: 'Folder shared successfully!' });
        setEmail('');
        setMessage('');
        fetchFolderShares();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error sharing folder');
      }
    } catch (error: any) {
      setAlert({ type: 'error', message: error.message || 'Error sharing folder' });
    } finally {
      setLoading(false);
    }
  };

  const createShareLink = async () => {
    if (!folder) return;

    setLoading(true);
    try {
      const requestBody: any = {
        folderId: folder.id,
        permission
      };

      if (expiresAt) {
        requestBody.expiresAt = new Date(expiresAt).toISOString();
      }

      if (usePassword && linkPassword.trim()) {
        requestBody.password = linkPassword.trim();
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/folders/${folder.id}/share-link`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        setAlert({ type: 'success', message: 'Share link created successfully!' });
        setExpiresAt('');
        setLinkPassword('');
        setUsePassword(false);
        fetchFolderShareLinks();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error creating share link');
      }
    } catch (error: any) {
      setAlert({ type: 'error', message: error.message || 'Error creating share link' });
    } finally {
      setLoading(false);
    }
  };

  const revokeShare = async (shareId: string) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/folder-shares/${shareId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setAlert({ type: 'success', message: 'Share revoked successfully!' });
        fetchFolderShares();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error revoking share');
      }
    } catch (error: any) {
      setAlert({ type: 'error', message: error.message || 'Error revoking share' });
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
        fetchFolderShareLinks();
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!folder) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <FolderSharedIcon />
          Share Folder: {folder.name}
        </Box>
      </DialogTitle>
      <DialogContent>
        {alert && (
          <Alert severity={alert.type} sx={{ mb: 2 }} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}

        <Tabs value={activeTab} onChange={handleTabChange} aria-label="folder sharing options">
          <Tab icon={<PersonIcon />} label="Share with User" />
          {/* <Tab icon={<LinkIcon />} label="Create Share Link" />
          <Tab icon={<ShareIcon />} label="Manage Shares" /> */}
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              placeholder="Enter user email to share with"
              required
            />
            
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
              label="Message (Optional)"
              multiline
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              fullWidth
              placeholder="Add a message to the recipient"
            />

            <Button
              variant="contained"
              onClick={shareWithUser}
              disabled={loading || !email.trim()}
              startIcon={loading ? <CircularProgress size={20} /> : <ShareIcon />}
            >
              {loading ? 'Sharing...' : 'Share with User'}
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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

            <Button
              variant="contained"
              onClick={createShareLink}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <LinkIcon />}
            >
              {loading ? 'Creating...' : 'Create Share Link'}
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6">User Shares</Typography>
            {folderShares.length === 0 ? (
              <Typography color="text.secondary">No user shares yet</Typography>
            ) : (
              <List>
                {folderShares.map((share) => (
                  <ListItem key={share.id} divider>
                    <ListItemText
                      primary={share.sharedWithUser?.email || 'Unknown User'}
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            Permission: {share.permission}
                          </Typography>
                          <Typography variant="caption">
                            Shared: {formatDate(share.createdAt)}
                          </Typography>
                          {share.message && (
                            <Typography variant="caption" display="block">
                              Message: {share.message}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Revoke Share">
                        <IconButton
                          edge="end"
                          onClick={() => revokeShare(share.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}

            <Typography variant="h6" sx={{ mt: 2 }}>Share Links</Typography>
            {folderShareLinks.length === 0 ? (
              <Typography color="text.secondary">No share links yet</Typography>
            ) : (
              <List>
                {folderShareLinks.map((link) => (
                  <ListItem key={link.id} divider>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                            {`${window.location.origin}/folder-share/${link.shareToken}`}
                          </Typography>
                          <Tooltip title="Copy Link">
                            <IconButton
                              size="small"
                              onClick={() => copyToClipboard(`${window.location.origin}/folder-share/${link.shareToken}`)}
                            >
                              <CopyIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            Permission: {link.permission}
                          </Typography>
                          <Typography variant="caption">
                            Created: {formatDate(link.createdAt)}
                          </Typography>
                          {link.expiresAt && (
                            <Typography variant="caption" display="block">
                              Expires: {formatDate(link.expiresAt)}
                            </Typography>
                          )}
                          {link.passwordHash && (
                            <Chip label="Password Protected" size="small" color="primary" sx={{ mt: 0.5 }} />
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
                ))}
              </List>
            )}
          </Box>
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};