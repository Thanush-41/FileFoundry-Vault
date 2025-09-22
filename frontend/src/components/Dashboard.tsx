import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Paper,
  Button,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Menu,
  MenuItem as MenuItemMUI,
  Divider,
  Fab,
  TextField,
  Snackbar,
  Alert as MuiAlert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Collapse,
} from '@mui/material';
import {
  CloudUpload,
  Share,
  Storage,
  Logout,
  AccountCircle,
  Add,
  FolderOpen,
  InsertDriveFile,
  GridView,
  ViewList,
  Savings,
  Search,
  FilterList,
  Clear,
  ExpandLess,
  ExpandMore,
  Close,
  AdminPanelSettings,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { FileUpload } from './FileUpload';
import { FileList } from './FileList';
import { AdminPanel } from './AdminPanel';
import { SharedFilesView } from './SharedFilesView';
import { SharedFoldersView } from './SharedFoldersView';
import { PublicFilesView } from './PublicFilesView';
import { SearchResults } from './SearchResults';
import { AdvancedSearch, SearchFilters } from './AdvancedSearch';
import { useSearch, SearchResult } from '../hooks/useSearch';

export const Dashboard: React.FC = () => {
  console.log('🏗️ Dashboard component rendering/mounting');
  console.log('🔧 Environment check:', {
    REACT_APP_API_URL: process.env.REACT_APP_API_URL,
    nodeEnv: process.env.NODE_ENV
  });
  const { user, logout, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalFiles: 0,
    foldersCreated: 0,
    filesShared: 0,
    totalUploadedBytes: 0,
    actualStorageBytes: 0,
    savedBytes: 0,
    savingsPercent: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [fileListRefresh, setFileListRefresh] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Folder creation state
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderCreating, setFolderCreating] = useState(false);
  const [parentFolderId, setParentFolderId] = useState<string>('');
  const [availableFolders, setAvailableFolders] = useState<any[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info'>('success');

  // Dialog states
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  
  // Search functionality
  const {
    results: searchResults,
    total: searchTotal,
    loading: searchLoading,
    error: searchError,
    hasMore: searchHasMore,
    currentPage: searchCurrentPage,
    performSearch,
    loadMore: loadMoreResults,
    clearResults: clearSearchResults,
  } = useSearch();

  // Add logging for state changes
  useEffect(() => {
    console.log('📊 Dialog State Changed:', {
      folderDialogOpen,
      timestamp: new Date().toISOString()
    });
  }, [folderDialogOpen]);

  useEffect(() => {
    console.log('📝 Folder Name Changed:', newFolderName);
  }, [newFolderName]);

  useEffect(() => {
    console.log('🔧 Folder Creating State:', folderCreating);
  }, [folderCreating]);

  // Fetch folders when dialog opens
  useEffect(() => {
    if (folderDialogOpen) {
      fetchAvailableFolders();
    }
  }, [folderDialogOpen, token]);

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

  // Fetch available folders for parent selection
  const fetchAvailableFolders = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/folders/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableFolders(data.folders || []);
      } else {
        console.error('❌ Failed to fetch folders');
      }
    } catch (error) {
      console.error('❌ Error fetching folders:', error);
    }
  };

  // Folder creation functions
  const handleCreateFolder = async () => {
    console.log('🚀 handleCreateFolder called', {
      newFolderName: newFolderName,
      trimmed: newFolderName.trim(),
      token: token ? 'Token exists' : 'No token'
    });

    if (!newFolderName.trim()) {
      console.log('❌ Empty folder name, showing error');
      setSnackbarMessage('Please enter a folder name');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    try {
      console.log('🔄 Starting folder creation API call...');
      setFolderCreating(true);
      
      const requestBody = {
        name: newFolderName.trim(),
        parent_id: parentFolderId || null, // Use selected parent or null for root
      };
      
      console.log('📤 API Request:', {
        url: `${process.env.REACT_APP_API_URL}/api/v1/folders/`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: requestBody
      });

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/folders/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Folder created successfully:', responseData);
        setSnackbarMessage('Folder created successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        setFolderDialogOpen(false);
        setNewFolderName('');
        setFileListRefresh(prev => prev + 1); // Refresh file list
      } else {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        setSnackbarMessage(errorData.error || 'Failed to create folder');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('💥 Network/JavaScript Error:', error);
      setSnackbarMessage('Error creating folder');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      console.log('🏁 Folder creation process finished');
      setFolderCreating(false);
    }
  };

  const handleCloseFolderDialog = () => {
    console.log('❌ Closing folder dialog');
    setFolderDialogOpen(false);
    setNewFolderName('');
    setParentFolderId('');
  };

  const handleSnackbarClose = () => {
    console.log('📪 Closing snackbar');
    setSnackbarOpen(false);
  };

  // Search handlers
  const handleQuickSearch = async (query: string) => {
    if (!query.trim()) {
      setShowSearchResults(false);
      clearSearchResults();
      return;
    }

    const filters: SearchFilters = {
      query: query.trim(),
      mimeTypes: [],
      minSize: null,
      maxSize: null,
      startDate: '',
      endDate: '',
      sortBy: 'date',
      sortOrder: 'desc',
    };

    try {
      await performSearch(filters);
      setShowSearchResults(true);
      setSearchExpanded(true);
    } catch (err) {
      console.error('Quick search error:', err);
      setSnackbarMessage('Search failed. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleAdvancedSearch = async (filters: SearchFilters) => {
    try {
      await performSearch(filters);
      setShowAdvancedSearch(false);
      setShowSearchResults(true);
      setSearchExpanded(true);
      setSnackbarMessage(`Search completed. Found ${searchResults.length} results.`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Advanced search error:', err);
      setSnackbarMessage('Search failed. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleFileDownload = async (file: SearchResult) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setSnackbarMessage('Please log in to download files.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }

      const response = await fetch(`/api/v1/files/${file.id}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSnackbarMessage(`Downloaded ${file.name}`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Download error:', err);
      setSnackbarMessage('Download failed. Please try again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleFilePreview = (file: SearchResult) => {
    if (file.previewUrl) {
      window.open(file.previewUrl, '_blank');
    } else {
      setSnackbarMessage('Preview not available for this file type.');
      setSnackbarSeverity('info');
      setSnackbarOpen(true);
    }
  };

  const handleFileShare = async (file: SearchResult) => {
    try {
      if (navigator.share && file.downloadUrl) {
        await navigator.share({
          title: `Share ${file.name}`,
          text: `Check out this file: ${file.name}`,
          url: file.downloadUrl,
        });
      } else if (file.downloadUrl) {
        await navigator.clipboard.writeText(file.downloadUrl);
        setSnackbarMessage('File link copied to clipboard!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        setSnackbarMessage('File sharing not available.');
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
      }
    } catch (err) {
      console.error('Share error:', err);
      setSnackbarMessage('Failed to share file.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const handleSearchKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleQuickSearch(searchQuery);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setShowSearchResults(false);
    setSearchExpanded(false);
    clearSearchResults();
  };

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  // Log user data for debugging (always run this hook)
  useEffect(() => {
    console.log('📊 Dashboard mounted, user data:', user);
    if (user) {
      console.log('👤 User details:', {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        storageQuota: user.storageQuota,
        storageUsed: user.storageUsed,
      });
    } else {
      console.log('❌ No user data available');
    }
  }, [user]);

  // Fetch real stats from backend (always run this hook)
  useEffect(() => {
    // Only fetch stats for regular users, not admins
    if (isAdmin) {
      return;
    }

    const fetchStats = async () => {
      if (!token) {
        console.log('❌ No token available for stats');
        return;
      }

      try {
        console.log('📈 Fetching user stats...');
        setIsLoadingStats(true);
        
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/files/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Stats fetched successfully:', data);
          setStats({
            totalFiles: data.file_count || 0,
            foldersCreated: data.foldersCreated || 0,
            filesShared: data.filesShared || 0,
            totalUploadedBytes: data.total_uploaded_bytes || 0,
            actualStorageBytes: data.actual_storage_bytes || 0,
            savedBytes: data.saved_bytes || 0,
            savingsPercent: data.storage_efficiency || 0,
          });
        } else {
          console.error('❌ Failed to fetch stats:', response.status, response.statusText);
          if (response.status === 429) {
            // Handle rate limiting gracefully
            const errorData = await response.json().catch(() => ({}));
            const retryAfter = errorData.retry_after || 1;
            alert(`⚠️ Rate limit exceeded. Please wait ${retryAfter} second(s) before trying again.\n\n${errorData.message || 'Too many requests.'}`);
          }
        }
      } catch (error) {
        console.error('❌ Error fetching stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    if (user && !isAdmin) {
      fetchStats();
    }
  }, [user, isAdmin, token]); // Added token to dependencies

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const storagePercentage = user ? (user.storageUsed / user.storageQuota) * 100 : 0;

  const refreshStats = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/files/stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalFiles: data.file_count || 0,
          foldersCreated: data.foldersCreated || 0,
          filesShared: data.filesShared || 0,
          totalUploadedBytes: data.total_uploaded_bytes || 0,
          actualStorageBytes: data.actual_storage_bytes || 0,
          savedBytes: data.saved_bytes || 0,
          savingsPercent: data.storage_efficiency || 0,
        });
      }
    } catch (error) {
      console.error('❌ Error refreshing stats:', error);
    }
  };

  const handleFileDeleted = () => {
    console.log('🗑️ File deleted, refreshing stats...');
    refreshStats();
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // If user is admin, show admin panel (after all hooks are called)
  if (isAdmin) {
    return <AdminPanel />;
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: 'background.default',
      color: 'text.primary',
      '& .MuiCard-root': {
        bgcolor: 'background.paper',
        boxShadow: '0 4px 12px rgba(255, 255, 255, 0.05)',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }
    }}>
      {/* Modern Dark Header */}
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{ 
          bgcolor: 'background.default', 
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.primary'
        }}
      >
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Storage sx={{ fontSize: 28, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, fontSize: '22px' }}>
              FileFoundry
            </Typography>
          </Box>
          
          <Box sx={{ flexGrow: 1 }} />
          
          {/* User Info & Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button 
              color="inherit" 
              onClick={() => setLearnMoreOpen(true)}
              sx={{
                color: 'text.primary',
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
            <Button 
              color="inherit" 
              onClick={() => setAdminLoginOpen(true)}
              sx={{
                color: 'text.primary',
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
              startIcon={<AdminPanelSettings />}
              size="small"
            >
              Admin Login
            </Button>
            <IconButton
              color="inherit"
              onClick={() => navigate('/search')}
              sx={{ 
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)' }
              }}
              title="Search Files"
            >
              <Search />
            </IconButton>
            <Typography variant="body2" sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>
              {user?.email}
            </Typography>
            <IconButton
              size="large"
              onClick={handleUserMenuOpen}
              sx={{ p: 0 }}
            >
              <Avatar sx={{ 
                width: 32, 
                height: 32, 
                bgcolor: 'primary.main', 
                fontSize: 14,
                color: 'primary.contrastText'
              }}>
                {user?.username?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleUserMenuClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  boxShadow: '0 8px 32px rgba(255, 255, 255, 0.1)',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  minWidth: 200,
                  bgcolor: 'background.paper',
                }
              }}
            >
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {user?.username}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {user?.email}
                </Typography>
              </Box>
              <MenuItemMUI onClick={handleUserMenuClose} sx={{ py: 1.5 }}>
                <AccountCircle sx={{ mr: 2, color: 'text.secondary' }} />
                My Account
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
        {/* Quick Actions Bar */}
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setUploadDialogOpen(true)}
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              textTransform: 'none',
              borderRadius: '12px',
              px: 3,
              py: 1.5,
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 4px 16px rgba(255, 255, 255, 0.15)',
              '&:hover': {
                bgcolor: 'primary.dark',
                boxShadow: '0 6px 20px rgba(255, 255, 255, 0.2)',
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            New
          </Button>
        </Box>

        {/* Search Bar */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ py: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Paper elevation={0} sx={{ p: 1, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider' }}>
                <TextField
                  fullWidth
                  placeholder="Search your files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Box display="flex" gap={1}>
                          {searchQuery && (
                            <IconButton onClick={handleClearSearch} size="small">
                              <Clear />
                            </IconButton>
                          )}
                          <IconButton 
                            onClick={() => setShowAdvancedSearch(true)}
                            color="primary"
                            size="small"
                          >
                            <FilterList />
                          </IconButton>
                          <IconButton
                            onClick={() => setSearchExpanded(!searchExpanded)}
                            size="small"
                          >
                            {searchExpanded ? <ExpandLess /> : <ExpandMore />}
                          </IconButton>
                        </Box>
                      </InputAdornment>
                    ),
                  }}
                  variant="standard"
                  sx={{ 
                    '& .MuiInput-underline:before': { borderBottom: 'none' },
                    '& .MuiInput-underline:after': { borderBottom: 'none' },
                    '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
                  }}
                />
              </Paper>
              
              <Box display="flex" justifyContent="center" mt={2}>
                <Button
                  variant="contained"
                  startIcon={<Search />}
                  onClick={() => handleQuickSearch(searchQuery)}
                  disabled={!searchQuery.trim() || searchLoading}
                  sx={{ px: 4 }}
                >
                  {searchLoading ? 'Searching...' : 'Search'}
                </Button>
              </Box>
            </Box>

            {/* Search Results Section */}
            <Collapse in={showSearchResults && searchExpanded}>
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <SearchResults
                  results={searchResults}
                  total={searchTotal}
                  loading={searchLoading}
                  error={searchError}
                  hasMore={searchHasMore}
                  currentPage={searchCurrentPage}
                  onLoadMore={loadMoreResults}
                  onDownload={handleFileDownload}
                  onPreview={handleFilePreview}
                  onShare={handleFileShare}
                />
              </Box>
            </Collapse>
          </CardContent>
        </Card>

        {/* Storage Usage Card */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                  {formatBytes(user?.storageUsed || 0)} of {formatBytes(user?.storageQuota || 0)} used
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={storagePercentage}
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: storagePercentage > 80 ? '#ffffff' : 'primary.main',
                      borderRadius: 4,
                    }
                  }}
                />
                {/* Deduplication Savings Info */}
                {stats.savedBytes > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: 'success.main', fontSize: '0.75rem' }}>
                      💾 Saved {formatBytes(stats.savedBytes)} ({stats.savingsPercent.toFixed(1)}%) through deduplication
                    </Typography>
                  </Box>
                )}
              </Box>
              <Typography variant="body2" sx={{ color: 'text.secondary', ml: 2, minWidth: 'fit-content' }}>
                {storagePercentage.toFixed(1)}%
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <Box sx={{ mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '14px',
                fontWeight: 500,
                color: 'text.secondary',
                minHeight: '48px',
              },
              '& .Mui-selected': {
                color: 'primary.main',
              },
              '& .MuiTabs-indicator': {
                bgcolor: 'primary.main',
                height: '3px',
              }
            }}
          >
            <Tab label="My Drive" />
            <Tab label="Recent" />
            <Tab label="Starred" disabled />
            <Tab label="Shared Files" />
            <Tab label="Shared Folders" />
            <Tab label="Public Files" />
          </Tabs>
        </Box>

        {/* Main Content */}
        {activeTab === 0 && (
          <Box>
            {/* Quick Access Section */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 500, mb: 2 }}>
                Quick access
              </Typography>
              <Box 
                sx={{ 
                  display: 'grid',
                  gridTemplateColumns: { 
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                    lg: 'repeat(5, 1fr)'
                  },
                  gap: 2
                }}
              >
                {/* File Upload Card */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 3,
                    transition: 'all 0.2s ease',
                    bgcolor: 'background.paper',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'rgba(255, 255, 255, 0.02)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 24px rgba(255, 255, 255, 0.1)',
                    },
                  }}
                  onClick={() => setUploadDialogOpen(true)}
                >
                  <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 500, mb: 1 }}>
                    Upload Files
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Drag files here or click to browse
                  </Typography>
                </Paper>

                {/* Create Folder Card */}
                <Paper
                  component="div"
                  elevation={0}
                  onClick={(e) => {
                    console.log('🔥 NEW FOLDER CARD CLICKED!', {
                      event: e,
                      timestamp: new Date().toISOString(),
                      currentFolderDialogState: folderDialogOpen
                    });
                    console.log('🔥 Setting folderDialogOpen to true...');
                    setFolderDialogOpen(true);
                    console.log('🔥 setFolderDialogOpen called');
                  }}
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 3,
                    transition: 'all 0.2s ease',
                    backgroundColor: 'background.paper',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'rgba(255, 255, 255, 0.02)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 24px rgba(255, 255, 255, 0.1)',
                    },
                    '&:active': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    },
                  }}
                >
                  <FolderOpen sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 500, mb: 1 }}>
                    New Folder
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Organize your files
                  </Typography>
                </Paper>

                {/* Stats Cards */}
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <InsertDriveFile sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 600, mb: 0.5 }}>
                      {isLoadingStats ? '...' : stats.totalFiles}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Files
                    </Typography>
                  </CardContent>
                </Card>

                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Share sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 600, mb: 0.5 }}>
                      {isLoadingStats ? '...' : stats.filesShared}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Shared
                    </Typography>
                  </CardContent>
                </Card>

                {/* Storage Savings Card */}
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Savings sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 600, mb: 0.5 }}>
                      {isLoadingStats ? '...' : `${Math.round(stats.savingsPercent)}%`}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      Storage Saved
                    </Typography>
                    {stats.savedBytes > 0 && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                        {formatBytes(stats.savedBytes)} saved
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Box>
            </Box>

            {/* Deduplication Details Section */}
            {stats.totalUploadedBytes > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, mb: 3 }}>
                  💾 File Deduplication Summary
                </Typography>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 600, mb: 1 }}>
                          {formatBytes(stats.totalUploadedBytes)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Total Uploaded
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" sx={{ color: 'success.main', fontWeight: 600, mb: 1 }}>
                          {formatBytes(stats.actualStorageBytes)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Actual Storage Used
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" sx={{ color: 'warning.main', fontWeight: 600, mb: 1 }}>
                          {formatBytes(stats.savedBytes)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Storage Saved
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" sx={{ color: 'info.main', fontWeight: 600, mb: 1 }}>
                          {stats.savingsPercent.toFixed(1)}%
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Efficiency Rate
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                        🔄 Duplicate files are automatically detected using SHA-256 content hashing.<br />
                        Only one copy of identical content is stored, saving you valuable storage space!
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* Recent Files Section */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 500 }}>
                  Recent files
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => setViewMode('grid')}
                    sx={{ color: viewMode === 'grid' ? 'primary.main' : 'text.secondary' }}
                  >
                    <GridView />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => setViewMode('list')}
                    sx={{ color: viewMode === 'list' ? 'primary.main' : 'text.secondary' }}
                  >
                    <ViewList />
                  </IconButton>
                </Box>
              </Box>
              <FileList 
                onFileDeleted={handleFileDeleted}
                refreshTrigger={fileListRefresh}
                viewMode={viewMode}
              />
            </Box>
          </Box>
        )}

        {activeTab === 1 && (
          <FileList 
            onFileDeleted={handleFileDeleted}
            refreshTrigger={fileListRefresh}
            viewMode={viewMode}
          />
        )}

        {activeTab === 3 && (
          <SharedFilesView />
        )}

        {activeTab === 4 && (
          <SharedFoldersView />
        )}

        {activeTab === 5 && (
          <PublicFilesView />
        )}
      </Container>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          '&:hover': {
            bgcolor: 'primary.dark',
            transform: 'scale(1.05)',
          },
          transition: 'all 0.2s ease-in-out',
        }}
        onClick={() => setUploadDialogOpen(true)}
      >
        <Add />
      </Fab>

      {/* Upload Dialog */}
      <Dialog 
        open={uploadDialogOpen} 
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload Files</DialogTitle>
        <DialogContent>
          <FileUpload 
            onUploadComplete={() => {
              console.log('� Upload completed, refreshing file list...');
              setUploadDialogOpen(false);
              refreshStats(); // Refresh stats
              setFileListRefresh(prev => prev + 1); // Trigger file list refresh
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Folder Creation Dialog */}
      {(() => {
        console.log('🪟 DIALOG RENDERING:', { folderDialogOpen, timestamp: new Date().toISOString() });
        return null;
      })()}
      <Dialog
        open={folderDialogOpen}
        onClose={handleCloseFolderDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Create New Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Folder Name"
            fullWidth
            variant="outlined"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !folderCreating) {
                handleCreateFolder();
              }
            }}
            disabled={folderCreating}
            sx={{ mt: 2 }}
          />
          
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Parent Folder (Optional)</InputLabel>
            <Select
              value={parentFolderId}
              onChange={(e) => setParentFolderId(e.target.value)}
              label="Parent Folder (Optional)"
              disabled={folderCreating}
            >
              <MenuItem value="">
                <em>Root Directory</em>
              </MenuItem>
              {availableFolders.map((folder) => (
                <MenuItem key={folder.id} value={folder.id}>
                  {folder.path || folder.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFolderDialog} disabled={folderCreating}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreateFolder} 
            variant="contained"
            disabled={folderCreating || !newFolderName.trim()}
          >
            {folderCreating ? <CircularProgress size={20} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Advanced Search Dialog */}
      <AdvancedSearch
        open={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        onSearch={handleAdvancedSearch}
        initialFilters={{}}
      />

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert 
          onClose={handleSnackbarClose} 
          severity={snackbarSeverity} 
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </MuiAlert>
      </Snackbar>

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

      {/* Admin Login Dialog */}
      <Dialog
        open={adminLoginOpen}
        onClose={() => setAdminLoginOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
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
          Admin Credentials
          <IconButton
            onClick={() => setAdminLoginOpen(false)}
            sx={{ color: 'text.secondary' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <AdminPanelSettings sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom sx={{ color: 'text.primary' }}>
              Admin Access Required
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
              For admin credentials and setup instructions, please check the repository README file.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={() => setAdminLoginOpen(false)}
            sx={{ color: 'text.secondary' }}
          >
            Close
          </Button>
          <Button 
            variant="contained"
            onClick={() => window.open('https://github.com/BalkanID-University/vit-2026-capstone-internship-hiring-task-Thanush-41', '_blank')}
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.dark' }
            }}
          >
            Go to Repository
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};