import { useState, useCallback } from 'react';
import { SearchFilters } from '../components/AdvancedSearch';

export interface SearchResult {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  path?: string;
  uploadedAt: string;
  updatedAt?: string;
  uploaderName?: string;
  isPublic?: boolean;
  downloadUrl?: string;
  previewUrl?: string;
}

export interface SearchResponse {
  files: any[];
  count?: number;
  total_count?: number;
  total?: number;
  pagination?: {
    current_page: number;
    total_pages: number;
    limit: number;
    has_next: boolean;
    has_previous: boolean;
  };
  hasMore?: boolean;
}

export interface UseSearchResult {
  results: SearchResult[];
  total: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;
  performSearch: (filters: SearchFilters, page?: number) => Promise<void>;
  loadMore: () => Promise<void>;
  clearResults: () => void;
}

export const useSearch = (): UseSearchResult => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters | null>(null);

  const buildSearchParams = useCallback((filters: SearchFilters, page: number = 1) => {
    const params = new URLSearchParams();
    
    if (filters.query) {
      params.append('search', filters.query);
    }
    
    if (filters.mimeTypes.length > 0) {
      filters.mimeTypes.forEach(type => params.append('mime_type', type));
    }
    
    if (filters.minSize !== null) {
      params.append('min_size', filters.minSize.toString());
    }
    
    if (filters.maxSize !== null) {
      params.append('max_size', filters.maxSize.toString());
    }
    
    if (filters.startDate) {
      params.append('start_date', filters.startDate);
    }
    
    if (filters.endDate) {
      params.append('end_date', filters.endDate);
    }
    
    params.append('sort_by', filters.sortBy);
    params.append('sort_order', filters.sortOrder);
    params.append('page', page.toString());
    params.append('limit', '20');
    
    return params;
  }, []);

  const performSearch = useCallback(async (filters: SearchFilters, page: number = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Use the advanced search endpoint for complex queries
      const shouldUseAdvancedSearch = 
        filters.mimeTypes.length > 0 || 
        filters.minSize !== null || 
        filters.maxSize !== null || 
        filters.startDate || 
        filters.endDate ||
        filters.sortBy !== 'date' ||
        filters.sortOrder !== 'desc';

      let response: Response;

      if (shouldUseAdvancedSearch) {
        // Use POST request for advanced search with JSON body
        const searchBody = {
          query: filters.query || '',
          mimeTypes: filters.mimeTypes,
          minSize: filters.minSize,
          maxSize: filters.maxSize,
          startDate: filters.startDate || '',
          endDate: filters.endDate || '',
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
          page: page,
          limit: 20,
        };

        response = await fetch(`/api/v1/files/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(searchBody),
        });
      } else {
        // Use simple GET request for basic queries
        const params = buildSearchParams(filters, page);
        response = await fetch(`/api/v1/files?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment before searching again.');
        } else if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Search failed with status ${response.status}`);
        }
      }

      const data: SearchResponse = await response.json();
      
      // Transform backend data to frontend format
      const transformedFiles = data.files?.map((file: any) => ({
        id: file.id,
        name: file.original_filename || file.filename,
        size: file.size,
        mimeType: file.mime_type,
        path: file.path || '',
        uploadedAt: file.createdAt,
        updatedAt: file.updatedAt,
        uploaderName: file.owner?.username || file.owner?.firstName || 'Unknown',
        isPublic: file.is_public,
        downloadUrl: `/api/v1/files/${file.id}/download`,
        previewUrl: `/api/v1/files/${file.id}/view`,
      })) || [];
      
      if (page === 1) {
        // New search - replace results
        setResults(transformedFiles);
        setCurrentPage(1);
      } else {
        // Load more - append results
        setResults(prev => [...prev, ...transformedFiles]);
        setCurrentPage(page);
      }
      
      setTotal(data.total_count || data.total || data.count || 0);
      setHasMore(data.pagination?.has_next || false);
      setCurrentFilters(filters);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while searching';
      setError(errorMessage);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [buildSearchParams]);

  const loadMore = useCallback(async () => {
    if (!currentFilters || loading || !hasMore) {
      return;
    }
    
    await performSearch(currentFilters, currentPage + 1);
  }, [currentFilters, currentPage, hasMore, loading, performSearch]);

  const clearResults = useCallback(() => {
    setResults([]);
    setTotal(0);
    setError(null);
    setHasMore(false);
    setCurrentPage(1);
    setCurrentFilters(null);
  }, []);

  return {
    results,
    total,
    loading,
    error,
    hasMore,
    currentPage,
    performSearch,
    loadMore,
    clearResults,
  };
};