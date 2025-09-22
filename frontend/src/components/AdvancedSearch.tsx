import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  Collapse,
  Card,
  CardContent,
  InputAdornment,
  Paper,
  SelectChangeEvent,
} from '@mui/material';
import {
  Search,
  FilterList,
  Clear,
  ExpandMore,
  ExpandLess,
  CalendarToday,
  Storage,
  Category,
} from '@mui/icons-material';

export interface SearchFilters {
  query: string;
  mimeTypes: string[];
  minSize: number | null;
  maxSize: number | null;
  startDate: string;
  endDate: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface AdvancedSearchProps {
  open: boolean;
  onClose: () => void;
  onSearch: (filters: SearchFilters) => void;
  initialFilters?: Partial<SearchFilters>;
}

const MIME_TYPES = [
  { label: 'Images', value: 'image/', icon: '🖼️' },
  { label: 'Documents (PDF)', value: 'application/pdf', icon: '📄' },
  { label: 'Word Documents', value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', icon: '📝' },
  { label: 'Excel Spreadsheets', value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', icon: '📊' },
  { label: 'PowerPoint', value: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', icon: '📈' },
  { label: 'Videos', value: 'video/', icon: '🎥' },
  { label: 'Audio', value: 'audio/', icon: '🎵' },
  { label: 'Text Files', value: 'text/', icon: '📄' },
  { label: 'Archives (ZIP)', value: 'application/zip', icon: '🗜️' },
  { label: 'Other', value: 'application/', icon: '📁' },
];

const SORT_OPTIONS = [
  { label: 'File Name', value: 'name' },
  { label: 'File Size', value: 'size' },
  { label: 'Upload Date', value: 'date' },
  { label: 'Modified Date', value: 'modified' },
  { label: 'File Type', value: 'mime' },
];

const SIZE_PRESETS = [
  { label: 'Small (< 1 MB)', min: null, max: 1024 * 1024 },
  { label: 'Medium (1-10 MB)', min: 1024 * 1024, max: 10 * 1024 * 1024 },
  { label: 'Large (> 10 MB)', min: 10 * 1024 * 1024, max: null },
];

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  open,
  onClose,
  onSearch,
  initialFilters,
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    mimeTypes: [],
    minSize: null,
    maxSize: null,
    startDate: '',
    endDate: '',
    sortBy: 'date',
    sortOrder: 'desc',
    ...initialFilters,
  });

  const [expandedSections, setExpandedSections] = useState({
    fileType: true,
    size: false,
    dates: false,
    advanced: false,
  });

  const [customSizeMode, setCustomSizeMode] = useState(false);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleMimeTypeToggle = (mimeType: string) => {
    setFilters(prev => ({
      ...prev,
      mimeTypes: prev.mimeTypes.includes(mimeType)
        ? prev.mimeTypes.filter(type => type !== mimeType)
        : [...prev.mimeTypes, mimeType],
    }));
  };

  const handleSizePreset = (preset: { min: number | null; max: number | null }) => {
    setFilters(prev => ({
      ...prev,
      minSize: preset.min,
      maxSize: preset.max,
    }));
    setCustomSizeMode(false);
  };

  const handleSearch = () => {
    onSearch(filters);
    onClose();
  };

  const handleClear = () => {
    setFilters({
      query: '',
      mimeTypes: [],
      minSize: null,
      maxSize: null,
      startDate: '',
      endDate: '',
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Search />
          <Typography variant="h6">Advanced Search</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          {/* Main Search Query */}
          <TextField
            fullWidth
            label="Search Files"
            placeholder="Enter filename or description..."
            value={filters.query}
            onChange={(e) => handleFilterChange('query', e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          {/* File Type Filter */}
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent sx={{ py: 1 }}>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                onClick={() => toggleSection('fileType')}
                sx={{ cursor: 'pointer' }}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Category />
                  <Typography variant="subtitle1">File Types</Typography>
                  {filters.mimeTypes.length > 0 && (
                    <Chip size="small" label={filters.mimeTypes.length} color="primary" />
                  )}
                </Box>
                {expandedSections.fileType ? <ExpandLess /> : <ExpandMore />}
              </Box>
              
              <Collapse in={expandedSections.fileType}>
                <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {MIME_TYPES.map((type) => (
                    <Button
                      key={type.value}
                      variant={filters.mimeTypes.includes(type.value) ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => handleMimeTypeToggle(type.value)}
                      startIcon={<span>{type.icon}</span>}
                      sx={{ mb: 1 }}
                    >
                      {type.label}
                    </Button>
                  ))}
                </Box>
              </Collapse>
            </CardContent>
          </Card>

          {/* File Size Filter */}
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent sx={{ py: 1 }}>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                onClick={() => toggleSection('size')}
                sx={{ cursor: 'pointer' }}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <Storage />
                  <Typography variant="subtitle1">File Size</Typography>
                  {(filters.minSize || filters.maxSize) && (
                    <Chip 
                      size="small" 
                      label={`${filters.minSize ? formatFileSize(filters.minSize) : '0'} - ${filters.maxSize ? formatFileSize(filters.maxSize) : '∞'}`}
                      color="primary" 
                    />
                  )}
                </Box>
                {expandedSections.size ? <ExpandLess /> : <ExpandMore />}
              </Box>
              
              <Collapse in={expandedSections.size}>
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    {SIZE_PRESETS.map((preset, index) => (
                      <Button
                        key={index}
                        variant="outlined"
                        size="small"
                        onClick={() => handleSizePreset(preset)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </Box>
                  
                  <Button
                    variant="text"
                    onClick={() => setCustomSizeMode(!customSizeMode)}
                    sx={{ mb: 2 }}
                  >
                    Custom Size Range
                  </Button>
                  
                  <Collapse in={customSizeMode}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        label="Min Size (bytes)"
                        type="number"
                        value={filters.minSize || ''}
                        onChange={(e) => handleFilterChange('minSize', e.target.value ? parseInt(e.target.value) : null)}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        label="Max Size (bytes)"
                        type="number"
                        value={filters.maxSize || ''}
                        onChange={(e) => handleFilterChange('maxSize', e.target.value ? parseInt(e.target.value) : null)}
                        sx={{ flex: 1 }}
                      />
                    </Box>
                  </Collapse>
                </Box>
              </Collapse>
            </CardContent>
          </Card>

          {/* Date Range Filter */}
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent sx={{ py: 1 }}>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                onClick={() => toggleSection('dates')}
                sx={{ cursor: 'pointer' }}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <CalendarToday />
                  <Typography variant="subtitle1">Date Range</Typography>
                  {(filters.startDate || filters.endDate) && (
                    <Chip size="small" label="Active" color="primary" />
                  )}
                </Box>
                {expandedSections.dates ? <ExpandLess /> : <ExpandMore />}
              </Box>
              
              <Collapse in={expandedSections.dates}>
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <TextField
                    label="Start Date"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="End Date"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                  />
                </Box>
              </Collapse>
            </CardContent>
          </Card>

          {/* Advanced Filters */}
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent sx={{ py: 1 }}>
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                onClick={() => toggleSection('advanced')}
                sx={{ cursor: 'pointer' }}
              >
                <Box display="flex" alignItems="center" gap={1}>
                  <FilterList />
                  <Typography variant="subtitle1">Advanced Options</Typography>
                </Box>
                {expandedSections.advanced ? <ExpandLess /> : <ExpandMore />}
              </Box>
              
              <Collapse in={expandedSections.advanced}>
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <FormControl sx={{ flex: 1 }} size="small">
                    <InputLabel>Sort By</InputLabel>
                    <Select
                      value={filters.sortBy}
                      label="Sort By"
                      onChange={(e: SelectChangeEvent) => handleFilterChange('sortBy', e.target.value)}
                    >
                      {SORT_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl sx={{ flex: 1 }} size="small">
                    <InputLabel>Sort Order</InputLabel>
                    <Select
                      value={filters.sortOrder}
                      label="Sort Order"
                      onChange={(e: SelectChangeEvent) => handleFilterChange('sortOrder', e.target.value)}
                    >
                      <MenuItem value="asc">Ascending</MenuItem>
                      <MenuItem value="desc">Descending</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Collapse>
            </CardContent>
          </Card>

          {/* Active Filters Summary */}
          {(filters.mimeTypes.length > 0 || filters.minSize || filters.maxSize || filters.startDate || filters.endDate) && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Active Filters:</Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {filters.mimeTypes.map((type) => {
                  const mimeInfo = MIME_TYPES.find(m => m.value === type);
                  return (
                    <Chip
                      key={type}
                      label={mimeInfo?.label || type}
                      size="small"
                      onDelete={() => handleMimeTypeToggle(type)}
                      color="primary"
                      variant="outlined"
                    />
                  );
                })}
                {filters.minSize && (
                  <Chip
                    label={`Min: ${formatFileSize(filters.minSize)}`}
                    size="small"
                    onDelete={() => handleFilterChange('minSize', null)}
                    color="secondary"
                    variant="outlined"
                  />
                )}
                {filters.maxSize && (
                  <Chip
                    label={`Max: ${formatFileSize(filters.maxSize)}`}
                    size="small"
                    onDelete={() => handleFilterChange('maxSize', null)}
                    color="secondary"
                    variant="outlined"
                  />
                )}
                {filters.startDate && (
                  <Chip
                    label={`From: ${filters.startDate}`}
                    size="small"
                    onDelete={() => handleFilterChange('startDate', '')}
                    color="info"
                    variant="outlined"
                  />
                )}
                {filters.endDate && (
                  <Chip
                    label={`To: ${filters.endDate}`}
                    size="small"
                    onDelete={() => handleFilterChange('endDate', '')}
                    color="info"
                    variant="outlined"
                  />
                )}
              </Box>
            </Paper>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleClear} startIcon={<Clear />}>
          Clear All
        </Button>
        <Button
          onClick={handleSearch}
          variant="contained"
          startIcon={<Search />}
        >
          Search
        </Button>
      </DialogActions>
    </Dialog>
  );
};