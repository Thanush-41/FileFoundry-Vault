import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Menu,
  MenuItem as MenuItemMUI,
  Divider,
  Container,
  SelectChangeEvent,
  Tabs,
  Tab,
  TextField,
  Paper,
  LinearProgress,
  Badge,
  Checkbox,
} from '@mui/material';
import {
  AdminPanelSettings,
  People,
  Storage,
  CloudUpload,
  TrendingUp,
  Delete,
  Logout,
  AccountCircle,
  Folder,
  Share,
  Savings,
  Description,
  Download,
  Visibility,
  FileUpload,
  Search,
  Public,
  Analytics,
  Refresh,
  Close,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import AnalyticsPage from './AnalyticsPage';
import { FilePreview } from './FilePreview';

// Type declaration for process.env
declare const process: {
  env: {
    REACT_APP_API_URL: string;
    [key: string]: string | undefined;
  };
};

interface GlobalStats {
  totalUsers: number;
  totalFiles: number;
  totalStorage: number;
  activeUsers: number;
  filesUploadedToday: number;
  totalFolders: number;
  totalSharedLinks: number;
  totalUploadedBytes: number;
  actualStorageBytes: number;
  globalSavedBytes: number;
  globalSavingsPercent: number;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  storageQuota: number;
  storageUsed: number;
  totalUploadedBytes: number;
  actualStorageBytes: number;
  savedBytes: number;
  isActive: boolean;
  emailVerified: boolean;
  lastLogin?: string;
  createdAt: string;
}

interface AdminFile {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  owner: AdminUser;
  folder?: {
    id: string;
    name: string;
    path: string;
  };
  downloadCount: number;
  lastDownload?: string;
  uniqueDownloaders: number;
}

interface FileStats {
  totalDownloads: number;
  uniqueDownloaders: number;
  totalBytesDownloaded: number;
  lastDownload?: string;
  shareCount: number;
  linkCount: number;
}

interface UserDeduplicationSummary {
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  totalFiles: number;
  totalUploadedBytes: number;
  actualStorageBytes: number;
  savedBytes: number;
  deduplicationRatio: number;
  storageEfficiency: number;
  uniqueFilesRatio: number;
  lastFileUpload?: string;
  isActive: boolean;
}

interface FileDeduplicationInfo {
  fileId: string;
  filename: string;
  originalFilename: string;
  size: number;
  fileHashId: string;
  hash: string;
  referenceCount: number;
  isDuplicate: boolean;
  createdAt: string;
}

export const AdminPanel: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [files, setFiles] = useState<AdminFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Individual loading states for retry functionality
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [isFilesLoading, setIsFilesLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  // File management state
  const [fileSearch, setFileSearch] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Enhanced file management state
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [uploadMode, setUploadMode] = useState<'private' | 'public' | 'share'>('private');
  const [shareWithUsers, setShareWithUsers] = useState<string[]>([]);
  const [userFiles, setUserFiles] = useState<AdminFile[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [fileToShare, setFileToShare] = useState<AdminFile | null>(null);
  const [selectedShareUsers, setSelectedShareUsers] = useState<string[]>([]);

  // User details dialog state
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState<any>(null);
  const [userDetailStats, setUserDetailStats] = useState<any>(null);

  // Dialog states
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);

  // File preview state
  const [previewFile, setPreviewFile] = useState<AdminFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Deduplication state
  const [deduplicationSummaries, setDeduplicationSummaries] = useState<any[]>([]);
  const [deduplicationDetailsOpen, setDeduplicationDetailsOpen] = useState(false);
  const [selectedUserDeduplication, setSelectedUserDeduplication] = useState<any>(null);
  const [loadingDeduplication, setLoadingDeduplication] = useState(false);

  // Handle user menu
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleUserMenuClose();
  };

  // API base URL
  const API_BASE = `${process.env.REACT_APP_API_URL}/api/v1`;

  // Get auth headers
  const getAuthHeaders = () => {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  // Load users list
  const loadUsersExternal = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/users`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load users');
    }
  };

  // Load user details with files and statistics
  const loadUserDetails = async (userId: string) => {
    console.log('Loading user details for:', userId);
    setLoadingUserDetails(true);
    try {
      const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to load user details');
      }

      const data = await response.json();
      console.log('User details loaded:', data);
      setSelectedUserDetails(data.user);
      setUserDetailStats(data.statistics);
      setUserFiles(data.files || []);
      console.log('Opening user details dialog...');
      setUserDetailsOpen(true);
    } catch (err) {
      console.error('Failed to load user details:', err);
      setError('Failed to load user details');
    } finally {
      setLoadingUserDetails(false);
    }
  };

  // Delete user
  const deleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      // Refresh users list
      await loadUsersExternal();
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError('Failed to delete user');
    }
  };

  // Load deduplication summary for all users
  const loadDeduplicationSummary = async () => {
    try {
      setLoadingDeduplication(true);
      const response = await fetch(`${API_BASE}/admin/deduplication/summary`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to load deduplication summary');
      }

      const data = await response.json();
      setDeduplicationSummaries(data.userDeduplicationSummaries || []);
    } catch (err) {
      console.error('Failed to load deduplication summary:', err);
      setError('Failed to load deduplication summary');
    } finally {
      setLoadingDeduplication(false);
    }
  };

  // Load detailed deduplication data for a specific user
  const loadUserDeduplicationDetails = async (userId: string) => {
    try {
      setLoadingDeduplication(true);
      const response = await fetch(`${API_BASE}/admin/deduplication/users/${userId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to load user deduplication details');
      }

      const data = await response.json();
      setSelectedUserDeduplication(data);
      setDeduplicationDetailsOpen(true);
    } catch (err) {
      console.error('Failed to load user deduplication details:', err);
      setError('Failed to load user deduplication details');
    } finally {
      setLoadingDeduplication(false);
    }
  };

  // Handle opening deduplication details
  const handleViewDeduplicationDetails = (user: UserDeduplicationSummary) => {
    loadUserDeduplicationDetails(user.userId);
  };

  // Format bytes to human readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  // File management functions
  const fetchFiles = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/files?page=1&limit=100`, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      
      const data = await response.json();
      setFiles(data.files || []);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Failed to load files');
    }
  };

  const handleUploadFiles = async () => {
    if (!uploadFiles || uploadFiles.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folderId', ''); // Root folder
        
        // Set sharing options based on upload mode
        if (uploadMode === 'public') {
          formData.append('makePublic', 'true');
        } else if (uploadMode === 'share' && shareWithUsers.length > 0) {
          formData.append('shareWithUsers', shareWithUsers.join(','));
        }
        
        const response = await fetch(`${API_BASE}/admin/files/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
        
        setUploadProgress(((i + 1) / uploadFiles.length) * 100);
      }
      
      setUploadFiles(null);
      setUploadMode('private');
      setShareWithUsers([]);
      await fetchFiles(); // Refresh file list
    } catch (err) {
      console.error('Error uploading files:', err);
      setError('Failed to upload files');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const fetchUserFiles = async (userId: string) => {
    if (userId === 'all') {
      setUserFiles([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/admin/users/${userId}/files`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user files');
      }

      const data = await response.json();
      setUserFiles(data.files || []);
    } catch (error) {
      console.error('Error fetching user files:', error);
      setError('Error fetching user files');
    }
  };

  const makeFilePublic = async (fileId: string) => {
    try {
      const response = await fetch(`${API_BASE}/admin/files/${fileId}/make-public`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to make file public');
      }

      const data = await response.json();
      setError(null);
      
      // Show success message with share link
      alert(`File made public! Share link: ${window.location.origin}/share/${data.shareToken}`);
      
      // Refresh files to show updated status
      await fetchFiles();
      if (selectedUserId !== 'all') {
        await fetchUserFiles(selectedUserId);
      }
    } catch (error) {
      console.error('Error making file public:', error);
      setError('Error making file public');
    }
  };

  const openShareDialog = (file: AdminFile) => {
    setFileToShare(file);
    setSelectedShareUsers([]);
    setShareDialogOpen(true);
  };

  // File preview functions
  const openFilePreview = (file: AdminFile) => {
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  const closeFilePreview = () => {
    setPreviewFile(null);
    setPreviewOpen(false);
  };

  const handleDownloadFromPreview = async (file: any) => {
    try {
      const response = await fetch(`${API_BASE}/admin/files/${file.id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.original_filename || file.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Download failed:', response.statusText);
        // You could add a toast notification here
      }
    } catch (error) {
      console.error('Download error:', error);
      // You could add a toast notification here
    }
  };

  const handleDirectDownload = async (file: any) => {
    await handleDownloadFromPreview(file);
  };

  const handleShareFile = async () => {
    console.log('handleShareFile called');
    console.log('fileToShare:', fileToShare);
    console.log('selectedShareUsers:', selectedShareUsers);
    
    if (!fileToShare || selectedShareUsers.length === 0) {
      console.log('Early return: missing fileToShare or selectedShareUsers');
      return;
    }

    const shareUrl = `${API_BASE}/admin/files/${fileToShare.id}/share`;
    const payload = {
      shared_with: selectedShareUsers,
      permission: 'download',
      message: `File shared by admin`,
    };
    
    console.log('Making API call to:', shareUrl);
    console.log('Payload:', payload);
    console.log('Headers:', getAuthHeaders());

    try {
      const response = await fetch(shareUrl, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);
      console.log('Response:', response);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response body:', errorText);
        throw new Error(`Failed to share file: ${response.status} ${errorText}`);
      }

      setError(null);
      alert(`File "${fileToShare.filename}" shared with ${selectedShareUsers.length} user(s) successfully!`);
      setShareDialogOpen(false);
      setFileToShare(null);
      setSelectedShareUsers([]);
      
      // Refresh files
      await fetchFiles();
      if (selectedUserId !== 'all') {
        await fetchUserFiles(selectedUserId);
      }
    } catch (error) {
      console.error('Error sharing file:', error);
      setError('Error sharing file: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleDeleteFiles = async () => {
    if (selectedFiles.length === 0) return;
    
    try {
      for (const fileId of selectedFiles) {
        const response = await fetch(`${API_BASE}/files/${fileId}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        
        if (!response.ok) {
          console.warn(`Failed to delete file ${fileId}`);
        }
      }
      
      setSelectedFiles([]);
      await fetchFiles(); // Refresh file list
    } catch (err) {
      console.error('Error deleting files:', err);
      setError('Failed to delete files');
    }
  };

  const filteredFiles = selectedUserId === 'all' 
    ? files.filter(file =>
        file.filename.toLowerCase().includes(fileSearch.toLowerCase()) ||
        file.owner?.username?.toLowerCase().includes(fileSearch.toLowerCase())
      )
    : userFiles.filter(file =>
        file.filename.toLowerCase().includes(fileSearch.toLowerCase())
      );

  const displayFiles = selectedUserId === 'all' ? files : userFiles;

  // Individual refresh functions with retry logic
  const refreshStats = async (retries = 3) => {
    setIsStatsLoading(true);
    setError(null);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${API_BASE}/admin/stats`, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Failed to load statistics (${response.status})`);
        }

        const data = await response.json();
        setStats(data);
        setIsStatsLoading(false);
        return;
      } catch (err) {
        console.error(`Attempt ${attempt} failed to load stats:`, err);
        if (attempt === retries) {
          setError(`Failed to load statistics after ${retries} attempts`);
          setIsStatsLoading(false);
          return;
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  };

  const refreshUsers = async (retries = 3) => {
    setIsUsersLoading(true);
    setError(null);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${API_BASE}/admin/users`, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Failed to load users (${response.status})`);
        }

        const data = await response.json();
        setUsers(data.users || []);
        setIsUsersLoading(false);
        return;
      } catch (err) {
        console.error(`Attempt ${attempt} failed to load users:`, err);
        if (attempt === retries) {
          setError(`Failed to load users after ${retries} attempts`);
          setIsUsersLoading(false);
          return;
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  };

  const refreshFiles = async (retries = 3) => {
    setIsFilesLoading(true);
    setError(null);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${API_BASE}/admin/files?page=1&limit=100`, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Failed to load files (${response.status})`);
        }

        const data = await response.json();
        setFiles(data.files || []);
        setIsFilesLoading(false);
        return;
      } catch (err) {
        console.error(`Attempt ${attempt} failed to load files:`, err);
        if (attempt === retries) {
          setError(`Failed to load files after ${retries} attempts`);
          setIsFilesLoading(false);
          return;
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  };

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch(`${API_BASE}/admin/stats`, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error('Failed to load statistics');
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Failed to load stats:', err);
        setError('Failed to load statistics');
      }
    };

    const loadUsers = async () => {
      try {
        const response = await fetch(`${API_BASE}/admin/users`, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error('Failed to load users');
        }

        const data = await response.json();
        setUsers(data.users || []);
      } catch (err) {
        console.error('Failed to load users:', err);
        setError('Failed to load users');
      }
    };

    const initializeData = async () => {
      setIsLoading(true);
      await Promise.all([loadStats(), loadUsers(), fetchFiles()]);
      setIsLoading(false);
    };

    initializeData();
  }, []); // Empty dependency array since functions are defined inside

  // Effect to fetch user files when selected user changes
  useEffect(() => {
    if (selectedUserId && selectedUserId !== 'all') {
      fetchUserFiles(selectedUserId);
    }
  }, [selectedUserId]);

  // Effect to load deduplication data when deduplication tab is active
  useEffect(() => {
    if (activeTab === 3) { // Deduplication tab
      loadDeduplicationSummary();
    }
  }, [activeTab]);

  if (!user || user.role !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Access denied. Admin privileges required.
        </Alert>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      {/* Modern Header */}
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{ 
          bgcolor: 'rgba(255, 255, 255, 0.1)', 
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white'
        }}
      >
        <Toolbar>
          <AdminPanelSettings sx={{ fontSize: 28, color: 'white', mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'white', fontWeight: 600 }}>
            Admin Dashboard
          </Typography>
          
          {/* User Info & Logout */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button 
              color="inherit" 
              onClick={() => setLearnMoreOpen(true)}
              sx={{
                color: 'white',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': { 
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.3s ease',
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 2,
              }}
              size="small"
            >
              Learn More
            </Button>
            {/* Debug button */}
            <Button
              onClick={() => {
                console.log('Debug button clicked - testing dialog');
                if (users.length > 0) {
                  loadUserDetails(users[0].id);
                } else {
                  console.log('No users available for testing');
                }
              }}
              sx={{ color: 'white', border: '1px solid white' }}
              variant="outlined"
              size="small"
            >
              Test Dialog
            </Button>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              Welcome, admin
            </Typography>
            <IconButton
              size="large"
              aria-label="account menu"
              aria-controls="user-menu"
              aria-haspopup="true"
              onClick={handleUserMenuOpen}
              color="inherit"
              sx={{ color: 'white' }}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255, 255, 255, 0.2)', fontSize: 14, color: 'white' }}>
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              id="user-menu"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleUserMenuClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  bgcolor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: 2,
                }
              }}
            >
              <MenuItemMUI onClick={handleUserMenuClose} sx={{ py: 1.5, color: 'text.primary' }}>
                <AccountCircle sx={{ mr: 2 }} />
                Profile
              </MenuItemMUI>
              <Divider />
              <MenuItemMUI onClick={handleLogout} sx={{ py: 1.5, color: 'text.primary' }}>
                <Logout sx={{ mr: 2 }} />
                Sign out
              </MenuItemMUI>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              bgcolor: 'rgba(255, 255, 255, 0.95)', 
              color: 'text.primary',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: 2,
            }} 
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Welcome Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, mb: 1 }}>
            Welcome, admin
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            Manage your file vault system
          </Typography>
        </Box>

        {/* Statistics Header with Refresh Button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 600 }}>
            System Statistics
          </Typography>
          <IconButton
            onClick={() => refreshStats()}
            disabled={isStatsLoading}
            sx={{
              color: 'white',
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.2)',
              },
              '&:disabled': {
                color: 'rgba(255, 255, 255, 0.5)',
              }
            }}
          >
            {isStatsLoading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <Refresh />}
          </IconButton>
        </Box>

        {/* Enhanced Statistics Cards */}
        {stats && (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: 3, 
            mb: 4 
          }}>
            <Card sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 3,
              transition: 'all 0.3s ease',
              '&:hover': { 
                transform: 'translateY(-4px)',
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              } 
            }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <People sx={{ fontSize: 48, color: 'white', mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'white', mb: 1 }}>
                  {stats.totalUsers}
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                  Total Users
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 3,
              transition: 'all 0.3s ease',
              '&:hover': { 
                transform: 'translateY(-4px)',
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              } 
            }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Storage sx={{ fontSize: 48, color: 'white', mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'white', mb: 1 }}>
                  {stats.totalFiles}
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                  Total Files
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 3,
              transition: 'all 0.3s ease',
              '&:hover': { 
                transform: 'translateY(-4px)',
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              } 
            }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <CloudUpload sx={{ fontSize: 48, color: 'white', mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'white', mb: 1 }}>
                  {stats.filesUploadedToday}
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                  Uploads Today
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 3,
              transition: 'all 0.3s ease',
              '&:hover': { 
                transform: 'translateY(-4px)',
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              } 
            }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <TrendingUp sx={{ fontSize: 48, color: 'white', mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'white', mb: 1 }}>
                  {stats.activeUsers}
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                  Active Users
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 3,
              transition: 'all 0.3s ease',
              '&:hover': { 
                transform: 'translateY(-4px)',
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              } 
            }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Folder sx={{ fontSize: 48, color: 'white', mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'white', mb: 1 }}>
                  {stats.totalFolders}
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                  Total Folders
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 3,
              transition: 'all 0.3s ease',
              '&:hover': { 
                transform: 'translateY(-4px)',
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              } 
            }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Share sx={{ fontSize: 48, color: 'white', mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'white', mb: 1 }}>
                  {stats.totalSharedLinks}
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                  Shared Links
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 3,
              transition: 'all 0.3s ease',
              '&:hover': { 
                transform: 'translateY(-4px)',
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              } 
            }}>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Savings sx={{ fontSize: 48, color: '#FFD700', mb: 2 }} />
                <Typography variant="h3" sx={{ fontWeight: 700, color: 'white', mb: 1 }}>
                  {stats.globalSavingsPercent ? `${Math.round(stats.globalSavingsPercent)}%` : '0%'}
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                  Storage Saved
                </Typography>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Navigation Tabs */}
        <Box sx={{ mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '14px',
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.7)',
                minHeight: '48px',
                '&.Mui-selected': {
                  color: 'white',
                },
              },
              '& .MuiTabs-indicator': {
                bgcolor: 'white',
                height: '3px',
                borderRadius: '2px',
              }
            }}
          >
            <Tab label="Dashboard" />
            <Tab label="Users" />
            <Tab label="Files" />
            <Tab label="Deduplication" />
            <Tab label="Analytics" icon={<Analytics />} />
          </Tabs>
        </Box>

        {/* Main Content */}
        <Paper sx={{ 
          bgcolor: 'rgba(255, 255, 255, 0.1)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: 3, 
          overflow: 'hidden' 
        }}>

          {/* Dashboard Tab */}
          {activeTab === 0 && (
            <Box sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: 'white', mb: 3 }}>
                Welcome to the Admin Dashboard
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 4 }}>
                Monitor your file vault system statistics and manage resources.
              </Typography>
              
              {/* Quick Actions */}
              <Box sx={{ 
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                gap: 3,
                mb: 4
              }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.15)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                    },
                  }}
                  onClick={() => setActiveTab(1)}
                >
                  <People sx={{ fontSize: 48, color: 'white', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 500, mb: 1 }}>
                    Manage Users
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    View and manage user accounts
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.15)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                    },
                  }}
                  onClick={() => setActiveTab(2)}
                >
                  <Storage sx={{ fontSize: 48, color: 'white', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 500, mb: 1 }}>
                    File Management
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    Upload and share files with users
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.15)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                    },
                  }}
                >
                  <TrendingUp sx={{ fontSize: 48, color: 'white', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 500, mb: 1 }}>
                    Analytics
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    View system usage statistics
                  </Typography>
                </Paper>
              </Box>
            </Box>
          )}

          {/* Users Tab */}
          {activeTab === 1 && (
            <Box>
              <Box sx={{ p: 4, borderBottom: '1px solid rgba(255, 255, 255, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: 'white' }}>
                    User Management
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mt: 1 }}>
                    Manage user accounts and permissions
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={isUsersLoading ? <CircularProgress size={20} /> : <Refresh />}
                  onClick={() => refreshUsers()}
                  disabled={isUsersLoading}
                  sx={{
                    color: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  {isUsersLoading ? 'Loading...' : 'Refresh Users'}
                </Button>
              </Box>
            
              <TableContainer sx={{ 
                maxHeight: 600,
                bgcolor: 'transparent',
                '& .MuiTable-root': {
                  bgcolor: 'transparent',
                },
                '& .MuiTableRow-root': {
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                  },
                },
                '& .MuiTableCell-root': {
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'white',
                },
              }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.1)', 
                        fontWeight: 600, 
                        color: 'white',
                        backdropFilter: 'blur(10px)',
                        borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
                      }}>User</TableCell>
                      <TableCell sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.1)', 
                        fontWeight: 600, 
                        color: 'white',
                        backdropFilter: 'blur(10px)',
                        borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
                      }}>Email</TableCell>
                      <TableCell sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.1)', 
                        fontWeight: 600, 
                        color: 'white',
                        backdropFilter: 'blur(10px)',
                        borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
                      }}>Role</TableCell>
                      <TableCell sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.1)', 
                        fontWeight: 600, 
                        color: 'white',
                        backdropFilter: 'blur(10px)',
                        borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
                      }}>Status</TableCell>
                      <TableCell sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.1)', 
                        fontWeight: 600, 
                        color: 'white',
                        backdropFilter: 'blur(10px)',
                        borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
                      }}>Storage</TableCell>
                      <TableCell sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.1)', 
                        fontWeight: 600, 
                        color: 'white',
                        backdropFilter: 'blur(10px)',
                        borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
                      }}>Deduplication</TableCell>
                      <TableCell sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.1)', 
                        fontWeight: 600, 
                        color: 'white',
                        backdropFilter: 'blur(10px)',
                        borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
                      }}>Last Login</TableCell>
                      <TableCell align="center" sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.1)', 
                        fontWeight: 600, 
                        color: 'white',
                        backdropFilter: 'blur(10px)',
                        borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
                      }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user: AdminUser) => (
                      <TableRow 
                        key={user.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('User row clicked:', user.username);
                          loadUserDetails(user.id);
                        }}
                        sx={{ 
                          '&:nth-of-type(odd)': { bgcolor: 'rgba(255, 255, 255, 0.02)' },
                          '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)', cursor: 'pointer' },
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                        <TableCell sx={{ color: 'white' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255, 255, 255, 0.2)', fontSize: 12, color: 'white' }}>
                              {user.username?.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>
                                {user.username}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                {user.firstName} {user.lastName}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          <Typography variant="body2" sx={{ color: 'white' }}>
                            {user.email}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          <Chip
                            label={user.role}
                            color={user.role === 'admin' ? 'default' : 'default'}
                            size="small"
                            sx={{
                              bgcolor: user.role === 'admin' ? 'rgba(139, 69, 19, 0.8)' : 'rgba(34, 139, 34, 0.8)',
                              color: 'white',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              fontSize: '0.75rem',
                              backdropFilter: 'blur(5px)'
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          <Chip
                            label={user.isActive ? 'Active' : 'Inactive'}
                            color={user.isActive ? 'default' : 'default'}
                            size="small"
                            sx={{
                              bgcolor: user.isActive ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)',
                              color: 'white',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              backdropFilter: 'blur(5px)'
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          <Typography variant="body2" sx={{ color: 'white' }}>
                            {(user.storageUsed / 1024 / 1024).toFixed(1)} MB / {(user.storageQuota / 1024 / 1024).toFixed(0)} MB
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                              {user.totalUploadedBytes > 0 
                                ? `${((user.savedBytes / user.totalUploadedBytes) * 100).toFixed(1)}% saved`
                                : '0% saved'
                              }
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                              {((user.savedBytes || 0) / 1024 / 1024).toFixed(1)} MB saved
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            {user.lastLogin
                              ? new Date(user.lastLogin).toLocaleDateString()
                              : 'Never'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ color: 'white' }}>
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            {user.role !== 'admin' && user.username !== 'admin' && (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<Delete />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteUser(user.id);
                                }}
                                sx={{
                                  borderColor: 'rgba(244, 67, 54, 0.8)',
                                  color: 'rgba(244, 67, 54, 0.9)',
                                  backdropFilter: 'blur(5px)',
                                  '&:hover': {
                                    borderColor: '#f44336',
                                    bgcolor: 'rgba(244, 67, 54, 0.1)',
                                    color: '#f44336'
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Files Tab */}
          {activeTab === 2 && (
            <Box>
              <Box sx={{ p: 4, borderBottom: '1px solid rgba(255, 255, 255, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'white', mb: 2 }}>
                  File Management
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={isFilesLoading ? <CircularProgress size={20} /> : <Refresh />}
                  onClick={() => refreshFiles()}
                  disabled={isFilesLoading}
                  sx={{
                    color: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  {isFilesLoading ? 'Loading...' : 'Refresh Files'}
                </Button>
              </Box>
                
              <Box sx={{ p: 4 }}>
                {/* File Upload Section */}
                <Box sx={{ mb: 3, p: 3, bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 2, backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <FileUpload sx={{ color: 'white' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'white' }}>
                      Upload Files
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', mb: 2 }}>
                    <Button
                      component="label"
                      variant="outlined"
                      startIcon={<FileUpload />}
                      sx={{
                        borderColor: '#000',
                        color: '#000',
                        '&:hover': {
                          borderColor: '#333333',
                          bgcolor: '#f0f0f0',
                        },
                      }}
                    >
                      Choose Files
                      <input
                        type="file"
                        multiple
                        hidden
                        onChange={(e) => setUploadFiles(e.target.files)}
                      />
                    </Button>
                    
                    {uploadFiles && uploadFiles.length > 0 && (
                      <>
                        <Typography variant="body2" sx={{ color: '#666666' }}>
                          {uploadFiles.length} file(s) selected
                        </Typography>
                        
                        <Button
                          variant="contained"
                          onClick={handleUploadFiles}
                          disabled={isUploading}
                          sx={{
                            bgcolor: '#000',
                            '&:hover': { bgcolor: '#333333' },
                          }}
                        >
                          {isUploading ? 'Uploading...' : 'Upload'}
                        </Button>
                      </>
                    )}
                  </Box>

                  {/* Upload Mode Selection */}
                  {uploadFiles && uploadFiles.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, color: '#000' }}>
                        Upload Mode:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          variant={uploadMode === 'private' ? 'contained' : 'outlined'}
                          onClick={() => setUploadMode('private')}
                          sx={{
                            bgcolor: uploadMode === 'private' ? '#000' : 'transparent',
                            color: uploadMode === 'private' ? 'white' : '#000',
                            borderColor: '#000',
                            '&:hover': {
                              bgcolor: uploadMode === 'private' ? '#333333' : '#f0f0f0',
                            },
                          }}
                        >
                          Private
                        </Button>
                        <Button
                          size="small"
                          variant={uploadMode === 'public' ? 'contained' : 'outlined'}
                          onClick={() => setUploadMode('public')}
                          sx={{
                            bgcolor: uploadMode === 'public' ? '#000' : 'transparent',
                            color: uploadMode === 'public' ? 'white' : '#000',
                            borderColor: '#000',
                            '&:hover': {
                              bgcolor: uploadMode === 'public' ? '#333333' : '#f0f0f0',
                            },
                          }}
                        >
                          Public
                        </Button>
                        <Button
                          size="small"
                          variant={uploadMode === 'share' ? 'contained' : 'outlined'}
                          onClick={() => setUploadMode('share')}
                          sx={{
                            bgcolor: uploadMode === 'share' ? '#000' : 'transparent',
                            color: uploadMode === 'share' ? 'white' : '#000',
                            borderColor: '#000',
                            '&:hover': {
                              bgcolor: uploadMode === 'share' ? '#333333' : '#f0f0f0',
                            },
                          }}
                        >
                          Share with Users
                        </Button>
                      </Box>
                      
                      {uploadMode === 'share' && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="caption" sx={{ color: '#666666', mb: 1, display: 'block' }}>
                            Select users to share with:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {users.filter(u => u.role === 'user').map(user => (
                              <Button
                                key={user.id}
                                size="small"
                                variant={shareWithUsers.includes(user.id) ? 'contained' : 'outlined'}
                                onClick={() => {
                                  if (shareWithUsers.includes(user.id)) {
                                    setShareWithUsers(shareWithUsers.filter(id => id !== user.id));
                                  } else {
                                    setShareWithUsers([...shareWithUsers, user.id]);
                                  }
                                }}
                                sx={{
                                  bgcolor: shareWithUsers.includes(user.id) ? '#000' : 'transparent',
                                  color: shareWithUsers.includes(user.id) ? 'white' : '#000',
                                  borderColor: '#000',
                                  fontSize: '0.75rem',
                                  '&:hover': {
                                    bgcolor: shareWithUsers.includes(user.id) ? '#333333' : '#f0f0f0',
                                  },
                                }}
                              >
                                {user.username}
                              </Button>
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  )}
                  
                  {isUploading && (
                    <Box sx={{ mt: 2 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={uploadProgress}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: '#e0e0e0',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: '#000',
                            borderRadius: 3,
                          }
                        }}
                      />
                      <Typography variant="caption" sx={{ color: '#666666', mt: 1, display: 'block' }}>
                        {Math.round(uploadProgress)}% uploaded
                      </Typography>
                    </Box>
                  )}
                </Box>
                
                {/* Search and Actions */}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
                  <TextField
                    size="small"
                    placeholder="Search files or users..."
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    InputProps={{
                      startAdornment: <Search sx={{ color: '#666666', mr: 1 }} />,
                    }}
                    sx={{
                      minWidth: 250,
                      '& .MuiOutlinedInput-root': {
                        borderColor: '#e0e0e0',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#000',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#000',
                        },
                      },
                    }}
                  />
                  
                  {/* User Selection Dropdown */}
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>View Files For</InputLabel>
                    <Select
                      value={selectedUserId}
                      label="View Files For"
                      onChange={(e) => setSelectedUserId(e.target.value as string)}
                      sx={{
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#e0e0e0',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#000',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#000',
                        },
                      }}
                    >
                      <MenuItem value="all">All Users</MenuItem>
                      {users.map(user => (
                        <MenuItem key={user.id} value={user.id}>
                          {user.username} ({user.role})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  {selectedFiles.length > 0 && (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleDeleteFiles}
                      sx={{ borderColor: '#f44336', color: '#f44336' }}
                    >
                      Delete Selected ({selectedFiles.length})
                    </Button>
                  )}
                </Box>
              </Box>
              
              {/* File List Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#000' }}>
                  {selectedUserId === 'all' ? 'All Files' : `Files for ${users.find(u => u.id === selectedUserId)?.username || 'User'}`}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                  {filteredFiles.length} file(s) found
                </Typography>
              </Box>

              {/* Files Table */}
              <TableContainer sx={{ 
                maxHeight: 600,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                '& .MuiTableCell-root': {
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }
              }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox" sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        color: 'white',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
                      }}>
                        <Checkbox
                          indeterminate={selectedFiles.length > 0 && selectedFiles.length < filteredFiles.length}
                          checked={filteredFiles.length > 0 && selectedFiles.length === filteredFiles.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFiles(filteredFiles.map(f => f.id));
                            } else {
                              setSelectedFiles([]);
                            }
                          }}
                          sx={{ color: 'white' }}
                        />
                      </TableCell>
                      <TableCell sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        fontWeight: 600,
                        color: 'white',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
                      }}>File</TableCell>
                      <TableCell sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        fontWeight: 600,
                        color: 'white',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
                      }}>Owner</TableCell>
                      <TableCell sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        fontWeight: 600,
                        color: 'white',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
                      }}>Size</TableCell>
                      <TableCell sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        fontWeight: 600,
                        color: 'white',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
                      }}>Downloads</TableCell>
                      <TableCell sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        fontWeight: 600,
                        color: 'white',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
                      }}>Created</TableCell>
                      <TableCell align="center" sx={{ 
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        fontWeight: 600,
                        color: 'white',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
                      }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredFiles.map((file) => (
                      <TableRow
                        key={file.id}
                        sx={{
                          '&:nth-of-type(odd)': { bgcolor: 'rgba(255, 255, 255, 0.02)' },
                          '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)' },
                          transition: 'background-color 0.2s ease'
                        }}
                      >
                        <TableCell padding="checkbox" sx={{ color: 'white' }}>
                          <Checkbox
                            checked={selectedFiles.includes(file.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFiles([...selectedFiles, file.id]);
                              } else {
                                setSelectedFiles(selectedFiles.filter(id => id !== file.id));
                              }
                            }}
                            sx={{ color: 'white' }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Description sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: 'white' }}>
                                {file.originalFilename}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                {file.mimeType}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', width: 24, height: 24, fontSize: 12, color: 'white' }}>
                              {file.owner?.username?.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography variant="body2" sx={{ color: 'white' }}>
                              {file.owner?.username || 'Unknown'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Badge badgeContent={file.downloadCount} color="primary" max={999}>
                              <Download sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 20 }} />
                            </Badge>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'white' }}>
                                {file.downloadCount}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                {file.uniqueDownloaders} unique
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            {new Date(file.createdAt).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ color: 'white' }}>
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <IconButton
                              size="small"
                              onClick={() => openFilePreview(file)}
                              sx={{ 
                                color: 'rgba(255, 255, 255, 0.8)', 
                                '&:hover': { 
                                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                                  color: 'white'
                                }
                              }}
                            >
                              <Visibility />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDirectDownload(file)}
                              sx={{ 
                                color: 'rgba(255, 255, 255, 0.8)', 
                                '&:hover': { 
                                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                                  color: 'white'
                                }
                              }}
                            >
                              <Download />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => makeFilePublic(file.id)}
                              sx={{ 
                                color: 'rgba(76, 175, 80, 0.9)', 
                                '&:hover': { 
                                  bgcolor: 'rgba(76, 175, 80, 0.1)',
                                  color: '#4caf50'
                                }
                              }}
                              title="Make Public"
                            >
                              <Public />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => openShareDialog(file)}
                              sx={{ 
                                color: 'rgba(255, 255, 255, 0.8)', 
                                '&:hover': { 
                                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                                  color: 'white'
                                }
                              }}
                              title="Share with Users"
                            >
                              <Share />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Deduplication Tab */}
          {activeTab === 3 && (
            <Box sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: 'white', mb: 3 }}>
                User Deduplication Summary
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 4 }}>
                View storage deduplication statistics for all users.
              </Typography>

              {/* Load Deduplication Data Button */}
              <Box sx={{ mb: 3 }}>
                <Button
                  variant="contained"
                  onClick={loadDeduplicationSummary}
                  disabled={loadingDeduplication}
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                    },
                  }}
                >
                  {loadingDeduplication ? <CircularProgress size={20} /> : 'Load Deduplication Summary'}
                </Button>
              </Box>

              {/* Deduplication Summary Table */}
              <TableContainer
                component={Paper}
                sx={{
                  bgcolor: 'rgba(0, 0, 0, 0.3)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>User</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Files</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Total Uploaded</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actual Storage</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Saved</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Dedup Ratio</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Efficiency</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Unique Files</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {deduplicationSummaries.map((summary) => (
                      <TableRow
                        key={summary.userId}
                        sx={{
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.05)',
                          },
                        }}
                      >
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                              {summary.username}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                              {summary.email}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>{summary.totalFiles}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{formatBytes(summary.totalUploadedBytes)}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{formatBytes(summary.actualStorageBytes)}</TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          <Typography
                            variant="body2"
                            sx={{
                              color: summary.savedBytes > 0 ? '#4caf50' : 'white',
                              fontWeight: summary.savedBytes > 0 ? 600 : 400,
                            }}
                          >
                            {formatBytes(summary.savedBytes)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          <Typography
                            variant="body2"
                            sx={{
                              color: summary.deduplicationRatio > 0 ? '#4caf50' : 'white',
                              fontWeight: summary.deduplicationRatio > 0 ? 600 : 400,
                            }}
                          >
                            {formatPercentage(summary.deduplicationRatio)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>{formatPercentage(summary.storageEfficiency)}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{formatPercentage(summary.uniqueFilesRatio)}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            onClick={() => handleViewDeduplicationDetails(summary)}
                            sx={{
                              color: 'rgba(255, 255, 255, 0.8)',
                              '&:hover': {
                                bgcolor: 'rgba(255, 255, 255, 0.1)',
                                color: 'white',
                              },
                            }}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {deduplicationSummaries.length === 0 && !loadingDeduplication && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    No deduplication data available. Click "Load Deduplication Summary" to fetch data.
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Analytics Tab */}
          {activeTab === 4 && (
            <Box sx={{ p: 0 }}>
              <AnalyticsPage />
            </Box>
          )}
        </Paper>

        {/* Share File Dialog */}
        <Dialog 
          open={shareDialogOpen} 
          onClose={() => setShareDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          sx={{
            '& .MuiDialog-paper': {
              borderRadius: 2,
            }
          }}
        >
          <DialogTitle sx={{ bgcolor: '#f8f9fa', color: '#000', fontWeight: 600 }}>
            Share "{fileToShare?.filename}" with Users
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ color: '#666666', mb: 2 }}>
              Select users to share this file with:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {users.filter(u => u.role === 'user').map(user => (
                <Button
                  key={user.id}
                  variant={selectedShareUsers.includes(user.id) ? 'contained' : 'outlined'}
                  onClick={() => {
                    if (selectedShareUsers.includes(user.id)) {
                      setSelectedShareUsers(selectedShareUsers.filter(id => id !== user.id));
                    } else {
                      setSelectedShareUsers([...selectedShareUsers, user.id]);
                    }
                  }}
                  sx={{
                    bgcolor: selectedShareUsers.includes(user.id) ? '#000' : 'transparent',
                    color: selectedShareUsers.includes(user.id) ? 'white' : '#000',
                    borderColor: '#000',
                    '&:hover': {
                      bgcolor: selectedShareUsers.includes(user.id) ? '#333333' : '#f0f0f0',
                    },
                  }}
                >
                  {user.username}
                </Button>
              ))}
            </Box>
            {selectedShareUsers.length > 0 && (
              <Typography variant="body2" sx={{ color: '#4caf50', mt: 2 }}>
                Selected {selectedShareUsers.length} user(s)
              </Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, bgcolor: '#f8f9fa' }}>
            <Button 
              onClick={() => setShareDialogOpen(false)}
              sx={{ color: '#666666' }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleShareFile}
              variant="contained"
              disabled={selectedShareUsers.length === 0}
              sx={{
                bgcolor: '#000',
                color: '#ffffff',
                '&:hover': {
                  bgcolor: '#333333'
                },
                '&:disabled': {
                  bgcolor: '#cccccc',
                  color: '#666666'
                }
              }}
            >
              Share with {selectedShareUsers.length} user(s)
            </Button>
          </DialogActions>
        </Dialog>

        {/* User Details Dialog */}
        <Dialog
          open={userDetailsOpen}
          onClose={() => setUserDetailsOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'rgba(5, 4, 31, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 2,
              color: 'white',
            }
          }}
        >
          <DialogTitle sx={{ 
            color: 'white', 
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            bgcolor: 'rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}>
              {selectedUserDetails?.username?.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {selectedUserDetails?.username} - Detailed View
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                {selectedUserDetails?.firstName} {selectedUserDetails?.lastName}
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            {loadingUserDetails ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress sx={{ color: 'white' }} />
              </Box>
            ) : selectedUserDetails && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* User Statistics Cards */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                  <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                        {userDetailStats?.totalFiles || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Total Files
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                        {userDetailStats?.uniqueFiles || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Unique Files
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                        {userDetailStats?.duplicateFiles || 0}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Duplicate Files
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                        {userDetailStats?.savingsPercent?.toFixed(1) || 0}%
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Storage Saved
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>

                {/* Storage Breakdown */}
                <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 2 }}>
                      Storage Breakdown
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 2 }}>
                      <Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          Total Uploaded
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'white' }}>
                          {((selectedUserDetails?.totalUploadedBytes || 0) / 1024 / 1024).toFixed(1)} MB
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          Actual Storage
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'white' }}>
                          {((selectedUserDetails?.actualStorageBytes || 0) / 1024 / 1024).toFixed(1)} MB
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          Space Saved
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#4caf50' }}>
                          {((selectedUserDetails?.savedBytes || 0) / 1024 / 1024).toFixed(1)} MB
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* User Files Table */}
                <Card sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 2 }}>
                      User Files ({userFiles.length})
                    </Typography>
                    <TableContainer sx={{ maxHeight: 400 }}>
                      <Table stickyHeader size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'white', fontWeight: 600 }}>
                              Filename
                            </TableCell>
                            <TableCell sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'white', fontWeight: 600 }}>
                              Size
                            </TableCell>
                            <TableCell sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'white', fontWeight: 600 }}>
                              Type
                            </TableCell>
                            <TableCell sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'white', fontWeight: 600 }}>
                              Uploaded
                            </TableCell>
                            <TableCell sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'white', fontWeight: 600 }}>
                              Deduplicated
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {userFiles.map((file: any) => (
                            <TableRow key={file.id} sx={{ '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' } }}>
                              <TableCell sx={{ color: 'white' }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {file.originalFilename}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ color: 'white' }}>
                                <Typography variant="body2">
                                  {(file.size / 1024).toFixed(1)} KB
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ color: 'white' }}>
                                <Chip
                                  label={file.mimeType ? file.mimeType.split('/')[1]?.toUpperCase() || 'UNKNOWN' : 'UNKNOWN'}
                                  size="small"
                                  sx={{
                                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    fontSize: '0.7rem'
                                  }}
                                />
                              </TableCell>
                              <TableCell sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                                <Typography variant="body2">
                                  {new Date(file.createdAt).toLocaleDateString()}
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ color: 'white' }}>
                                <Chip
                                  label={file.FileHash?.referenceCount > 1 ? 'Yes' : 'No'}
                                  size="small"
                                  sx={{
                                    bgcolor: file.FileHash?.referenceCount > 1 
                                      ? 'rgba(76, 175, 80, 0.8)' 
                                      : 'rgba(158, 158, 158, 0.8)',
                                    color: 'white',
                                    fontSize: '0.7rem'
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)', p: 2 }}>
            <Button
              onClick={() => setUserDetailsOpen(false)}
              sx={{
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
              variant="outlined"
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* File Preview Dialog */}
        <FilePreview
          file={previewFile ? {
            id: previewFile.id,
            filename: previewFile.filename,
            original_filename: previewFile.originalFilename,
            mime_type: previewFile.mimeType,
            size: previewFile.size,
            owner: previewFile.owner ? { id: previewFile.owner.id } : undefined
          } : null}
          open={previewOpen}
          onClose={closeFilePreview}
          onDownload={handleDownloadFromPreview}
          token={token}
          isAdmin={true}
        />

        {/* Deduplication Details Dialog */}
        <Dialog
          open={deduplicationDetailsOpen}
          onClose={() => setDeduplicationDetailsOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          <DialogTitle sx={{ color: 'white', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <Typography variant="h6" component="div">
              Deduplication Details - {selectedUserDeduplication?.user?.username}
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ color: 'white', p: 3 }}>
            {selectedUserDeduplication && (
              <>
                {/* User Summary Stats */}
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
                    Summary Statistics
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                    <Box sx={{ minWidth: 200, flex: 1 }}>
                      <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Total Files</Typography>
                        <Typography variant="h6" sx={{ color: 'white' }}>{selectedUserDeduplication.user.totalFiles}</Typography>
                      </Paper>
                    </Box>
                    <Box sx={{ minWidth: 200, flex: 1 }}>
                      <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Total Uploaded</Typography>
                        <Typography variant="h6" sx={{ color: 'white' }}>{formatBytes(selectedUserDeduplication.user.totalUploadedBytes)}</Typography>
                      </Paper>
                    </Box>
                    <Box sx={{ minWidth: 200, flex: 1 }}>
                      <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Actual Storage</Typography>
                        <Typography variant="h6" sx={{ color: 'white' }}>{formatBytes(selectedUserDeduplication.user.actualStorageBytes)}</Typography>
                      </Paper>
                    </Box>
                    <Box sx={{ minWidth: 200, flex: 1 }}>
                      <Paper sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Saved by Deduplication</Typography>
                        <Typography variant="h6" sx={{ color: '#4caf50' }}>{formatBytes(selectedUserDeduplication.user.savedBytes)}</Typography>
                      </Paper>
                    </Box>
                  </Box>
                </Box>

                {/* File Details Table */}
                <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
                  File Details
                </Typography>
                <TableContainer
                  component={Paper}
                  sx={{
                    bgcolor: 'rgba(0, 0, 0, 0.3)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    maxHeight: 400,
                  }}
                >
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ bgcolor: 'rgba(0, 0, 0, 0.7)', color: 'white', fontWeight: 600 }}>File Name</TableCell>
                        <TableCell sx={{ bgcolor: 'rgba(0, 0, 0, 0.7)', color: 'white', fontWeight: 600 }}>Size</TableCell>
                        <TableCell sx={{ bgcolor: 'rgba(0, 0, 0, 0.7)', color: 'white', fontWeight: 600 }}>Status</TableCell>
                        <TableCell sx={{ bgcolor: 'rgba(0, 0, 0, 0.7)', color: 'white', fontWeight: 600 }}>References</TableCell>
                        <TableCell sx={{ bgcolor: 'rgba(0, 0, 0, 0.7)', color: 'white', fontWeight: 600 }}>Upload Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedUserDeduplication.fileDetails?.map((file: FileDeduplicationInfo) => (
                        <TableRow
                          key={file.fileId}
                          sx={{
                            '&:hover': {
                              bgcolor: 'rgba(255, 255, 255, 0.05)',
                            },
                          }}
                        >
                          <TableCell sx={{ color: 'white' }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {file.originalFilename}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                              {file.filename}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ color: 'white' }}>{formatBytes(file.size)}</TableCell>
                          <TableCell>
                            <Chip
                              label={file.isDuplicate ? 'Duplicate' : 'Unique'}
                              size="small"
                              sx={{
                                bgcolor: file.isDuplicate ? 'rgba(255, 193, 7, 0.2)' : 'rgba(76, 175, 80, 0.2)',
                                color: file.isDuplicate ? '#ffc107' : '#4caf50',
                                border: `1px solid ${file.isDuplicate ? 'rgba(255, 193, 7, 0.5)' : 'rgba(76, 175, 80, 0.5)'}`,
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: 'white' }}>{file.referenceCount}</TableCell>
                          <TableCell sx={{ color: 'white' }}>
                            {new Date(file.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Statistics Summary */}
                {selectedUserDeduplication.statistics && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
                      Deduplication Statistics
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                      <Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          Unique Files: {selectedUserDeduplication.statistics.uniqueFiles}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          Duplicate Files: {selectedUserDeduplication.statistics.duplicateFiles}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                          Deduplication Ratio: {formatPercentage(selectedUserDeduplication.user.deduplicationRatio)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
              </>
            )}
            {loadingDeduplication && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', p: 2 }}>
            <Button
              onClick={() => setDeduplicationDetailsOpen(false)}
              sx={{
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255, 255, 255, 0.1)'
                }
              }}
              variant="outlined"
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Learn More Dialog */}
        <Dialog
          open={learnMoreOpen}
          onClose={() => setLearnMoreOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              height: '90vh',
              bgcolor: 'background.default',
              border: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          <DialogTitle sx={{ 
            bgcolor: 'background.paper',
            color: 'text.primary',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}>
            BalkanID Capstone Task - Learn More
            <IconButton
              onClick={() => setLearnMoreOpen(false)}
              sx={{ color: 'text.secondary' }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0, height: '100%' }}>
            <iframe
              src="https://docs.google.com/document/d/1cFsoTcaIGDyxV54NbxgEs7B0T9SxcvaIT0JRFps2bzA/edit"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              title="BalkanID Capstone Task Documentation"
            />
          </DialogContent>
        </Dialog>
      </Container>
    </Box>
  );
};
