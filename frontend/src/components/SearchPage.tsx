import React, { useState, useCallback } from 'react';
import {
  Box,
  Container,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  Paper,
  Fab,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList,
  Clear,
} from '@mui/icons-material';
import { AdvancedSearch, SearchFilters } from './AdvancedSearch';
import { SearchResults } from './SearchResults';
import { useSearch, SearchResult } from '../hooks/useSearch';

export const SearchPage: React.FC = () => {
  const [quickSearch, setQuickSearch] = useState('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const {
    results,
    total,
    loading,
    error,
    hasMore,
    currentPage,
    performSearch,
    loadMore,
    clearResults,
  } = useSearch();

  const handleQuickSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      clearResults();
      return;
    }

    const filters: SearchFilters = {
      query: searchQuery.trim(),
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
    } catch (err) {
      console.error('Quick search error:', err);
    }
  }, [performSearch, clearResults]);

  const handleAdvancedSearch = useCallback(async (filters: SearchFilters) => {
    try {
      await performSearch(filters);
      setShowAdvancedSearch(false);
      setSnackbar({
        open: true,
        message: `Search completed. Found ${results.length} results.`,
        severity: 'success',
      });
    } catch (err) {
      console.error('Advanced search error:', err);
      setSnackbar({
        open: true,
        message: 'Search failed. Please try again.',
        severity: 'error',
      });
    }
  }, [performSearch, results.length]);

  const handleFileDownload = useCallback(async (file: SearchResult) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setSnackbar({
          open: true,
          message: 'Please log in to download files.',
          severity: 'error',
        });
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

      setSnackbar({
        open: true,
        message: `Downloaded ${file.name}`,
        severity: 'success',
      });
    } catch (err) {
      console.error('Download error:', err);
      setSnackbar({
        open: true,
        message: 'Download failed. Please try again.',
        severity: 'error',
      });
    }
  }, []);

  const handleFilePreview = useCallback((file: SearchResult) => {
    if (file.previewUrl) {
      window.open(file.previewUrl, '_blank');
    } else {
      setSnackbar({
        open: true,
        message: 'Preview not available for this file type.',
        severity: 'info',
      });
    }
  }, []);

  const handleFileShare = useCallback(async (file: SearchResult) => {
    try {
      if (navigator.share && file.downloadUrl) {
        await navigator.share({
          title: `Share ${file.name}`,
          text: `Check out this file: ${file.name}`,
          url: file.downloadUrl,
        });
      } else if (file.downloadUrl) {
        await navigator.clipboard.writeText(file.downloadUrl);
        setSnackbar({
          open: true,
          message: 'File link copied to clipboard!',
          severity: 'success',
        });
      } else {
        setSnackbar({
          open: true,
          message: 'File sharing not available.',
          severity: 'info',
        });
      }
    } catch (err) {
      console.error('Share error:', err);
      setSnackbar({
        open: true,
        message: 'Failed to share file.',
        severity: 'error',
      });
    }
  }, []);

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleQuickSearch(quickSearch);
    }
  };

  const handleClearSearch = () => {
    setQuickSearch('');
    clearResults();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Search Header */}
      <Box textAlign="center" mb={4}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          Search Files
        </Typography>
        <Typography variant="h6" color="text.secondary" mb={4}>
          Find your files quickly with powerful search and filtering
        </Typography>

        {/* Quick Search Bar */}
        <Paper elevation={2} sx={{ p: 1, maxWidth: 600, mx: 'auto', mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search by filename..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            onKeyPress={handleKeyPress}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {quickSearch && (
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
                </InputAdornment>
              ),
            }}
            variant="outlined"
            size="medium"
            sx={{ 
              '& .MuiOutlinedInput-root': { 
                borderRadius: 2,
                '& fieldset': { border: 'none' },
              },
            }}
          />
        </Paper>

        {/* Quick Search Button */}
        <Box display="flex" justifyContent="center" gap={2}>
          <Fab
            variant="extended"
            color="primary"
            onClick={() => handleQuickSearch(quickSearch)}
            disabled={loading || !quickSearch.trim()}
            sx={{ px: 4 }}
          >
            <SearchIcon sx={{ mr: 1 }} />
            Search
          </Fab>
        </Box>
      </Box>

      {/* Search Results */}
      {(results.length > 0 || loading || error) && (
        <Box>
          <SearchResults
            results={results}
            total={total}
            loading={loading}
            error={error}
            hasMore={hasMore}
            currentPage={currentPage}
            onLoadMore={loadMore}
            onDownload={handleFileDownload}
            onPreview={handleFilePreview}
            onShare={handleFileShare}
          />
        </Box>
      )}

      {/* Empty State */}
      {!loading && !error && results.length === 0 && !quickSearch && (
        <Box textAlign="center" py={8}>
          <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" color="text.secondary" gutterBottom>
            Ready to search
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            Enter a filename above or use advanced filters to find your files
          </Typography>
          <Fab
            variant="extended"
            color="primary"
            onClick={() => setShowAdvancedSearch(true)}
            sx={{ px: 4 }}
          >
            <FilterList sx={{ mr: 1 }} />
            Advanced Search
          </Fab>
        </Box>
      )}

      {/* Advanced Search Modal */}
      <AdvancedSearch
        open={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        onSearch={handleAdvancedSearch}
        initialFilters={{ query: quickSearch }}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};