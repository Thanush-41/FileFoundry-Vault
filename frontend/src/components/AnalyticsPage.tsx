import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Tabs,
  Tab,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  CloudUpload,
  Download,
  Storage,
  FilePresent,
  Analytics,
  Timeline,
  PieChart,
  BarChart,
  Refresh
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  TimeScale,
  Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import axios from 'axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  TimeScale,
  Filler
);

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  totalFiles: number;
  totalStorage: number;
  filesUploadedToday: number;
  storageUsagePercent: number;
  totalDownloads: number;
  downloadsToday: number;
  downloadsThisWeek: number;
  uniqueDownloaders: number;
  activeSessions: number;
}

interface TimeSeriesData {
  date: string;
  value: number;
}

interface FileTypeDistribution {
  type: string;
  count: number;
  size: number;
}

interface TopFile {
  id: string;
  originalFilename: string;
  downloadCount: number;
  owner: string;
  size: number;
}

interface UserActivityData {
  username: string;
  filesUploaded: number;
  storageUsed: number;
  lastLogin: string | null;
  isActive: boolean;
}

const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [userTrend, setUserTrend] = useState<TimeSeriesData[]>([]);
  const [uploadTrend, setUploadTrend] = useState<TimeSeriesData[]>([]);
  const [downloadTrend, setDownloadTrend] = useState<TimeSeriesData[]>([]);
  const [storageTrend, setStorageTrend] = useState<TimeSeriesData[]>([]);
  const [fileTypes, setFileTypes] = useState<FileTypeDistribution[]>([]);
  const [topFiles, setTopFiles] = useState<TopFile[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('30');

  const API_BASE = `${process.env.REACT_APP_API_URL}/api/v1`;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const calculateTrend = (data: TimeSeriesData[]): number => {
    if (data.length < 2) return 0;
    
    const recent = data.slice(-7); // Last 7 days
    const previous = data.slice(-14, -7); // Previous 7 days
    
    if (recent.length === 0 || previous.length === 0) return 0;
    
    const recentAvg = recent.reduce((sum, item) => sum + item.value, 0) / recent.length;
    const previousAvg = previous.reduce((sum, item) => sum + item.value, 0) / previous.length;
    
    if (previousAvg === 0) return recentAvg > 0 ? 100 : 0;
    
    return Math.round(((recentAvg - previousAvg) / previousAvg) * 100);
  };

  const EmptyDataMessage = ({ title }: { title: string }) => (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: 300,
      color: 'rgba(255, 255, 255, 0.6)'
    }}>
      <Analytics sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
      <Typography variant="h6" sx={{ mb: 1 }}>No {title} Data</Typography>
      <Typography variant="body2" sx={{ textAlign: 'center' }}>
        Data will appear here once there is activity in the system
      </Typography>
    </Box>
  );

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const [
        overviewRes,
        userTrendRes,
        uploadTrendRes,
        downloadTrendRes,
        storageTrendRes,
        fileTypesRes,
        topFilesRes,
        userActivityRes
      ] = await Promise.all([
        axios.get(`${API_BASE}/admin/analytics/overview`, config),
        axios.get(`${API_BASE}/admin/analytics/user-registration-trend?days=${timeRange}`, config),
        axios.get(`${API_BASE}/admin/analytics/file-upload-trend?days=${timeRange}`, config),
        axios.get(`${API_BASE}/admin/analytics/download-trend?days=${timeRange}`, config),
        axios.get(`${API_BASE}/admin/analytics/storage-usage-trend?days=${timeRange}`, config),
        axios.get(`${API_BASE}/admin/analytics/file-type-distribution`, config),
        axios.get(`${API_BASE}/admin/analytics/top-files?limit=10`, config),
        axios.get(`${API_BASE}/admin/analytics/user-activity`, config)
      ]);

      console.log('Analytics Data:', {
        overview: overviewRes.data,
        userTrend: userTrendRes.data,
        uploadTrend: uploadTrendRes.data,
        downloadTrend: downloadTrendRes.data,
        storageTrend: storageTrendRes.data,
        fileTypes: fileTypesRes.data,
        topFiles: topFilesRes.data,
        userActivity: userActivityRes.data
      });

      setAnalytics(overviewRes.data);
      
      // Use only real API data - no fallbacks
      setUserTrend(userTrendRes.data || []);
      setUploadTrend(uploadTrendRes.data || []);
      setDownloadTrend(downloadTrendRes.data || []);
      setStorageTrend(storageTrendRes.data || []);
      setFileTypes(fileTypesRes.data || []);
      setTopFiles(topFilesRes.data || []);
      setUserActivity(userActivityRes.data || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Set empty arrays for real data only
      setAnalytics(null);
      setUserTrend([]);
      setUploadTrend([]);
      setDownloadTrend([]);
      setStorageTrend([]);
      setFileTypes([]);
      setTopFiles([]);
      setUserActivity([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const StatCard = ({ title, value, subtitle, icon, trend, color = 'primary' }: any) => (
    <Card sx={{ 
      bgcolor: 'rgba(255, 255, 255, 0.1)', 
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      height: '100%',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
      }
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ 
            p: 1.5, 
            borderRadius: 2, 
            bgcolor: `rgba(255, 255, 255, 0.1)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {icon}
          </Box>
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {trend > 0 ? <TrendingUp sx={{ color: 'white' }} /> : <TrendingDown sx={{ color: 'gray' }} />}
              <Typography variant="caption" sx={{ color: trend > 0 ? 'white' : 'gray', fontWeight: 600 }}>
                {trend > 0 ? '+' : ''}{trend}%
              </Typography>
            </Box>
          )}
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'white', mb: 1 }}>
          {value}
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  // Black and white color palette
  const colorPalette = {
    primary: 'rgba(255, 255, 255, 0.8)',       // White
    secondary: 'rgba(200, 200, 200, 0.8)',     // Light gray
    accent1: 'rgba(180, 180, 180, 0.8)',       // Medium gray
    accent2: 'rgba(160, 160, 160, 0.8)',       // Medium gray 2
    accent3: 'rgba(140, 140, 140, 0.8)',       // Dark gray
    accent4: 'rgba(120, 120, 120, 0.8)',       // Darker gray
    accent5: 'rgba(100, 100, 100, 0.8)',       // Very dark gray
    accent6: 'rgba(80, 80, 80, 0.8)'           // Almost black
  };

  const colorPaletteSolid = {
    primary: 'rgba(255, 255, 255, 1)',
    secondary: 'rgba(200, 200, 200, 1)',
    accent1: 'rgba(180, 180, 180, 1)',
    accent2: 'rgba(160, 160, 160, 1)',
    accent3: 'rgba(140, 140, 140, 1)',
    accent4: 'rgba(120, 120, 120, 1)',
    accent5: 'rgba(100, 100, 100, 1)',
    accent6: 'rgba(80, 80, 80, 1)'
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: 'white'
        }
      }
    },
    scales: {
      x: {
        ticks: { color: 'rgba(255, 255, 255, 0.8)' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      },
      y: {
        ticks: { color: 'rgba(255, 255, 255, 0.8)' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      }
    }
  };

  const lineChartData = (data: TimeSeriesData[], label: string, colorKey: keyof typeof colorPalette = 'primary') => ({
    labels: data.map(d => new Date(d.date).toLocaleDateString()),
    datasets: [
      {
        label,
        data: data.map(d => d.value),
        borderColor: colorPaletteSolid[colorKey],
        backgroundColor: colorPalette[colorKey],
        fill: true,
        tension: 0.4
      }
    ]
  });

  const pieChartData = {
    labels: fileTypes.map(ft => ft.type.charAt(0).toUpperCase() + ft.type.slice(1)),
    datasets: [
      {
        data: fileTypes.map(ft => ft.count),
        backgroundColor: [
          colorPalette.primary,
          colorPalette.secondary,
          colorPalette.accent1,
          colorPalette.accent2,
          colorPalette.accent3,
          colorPalette.accent4,
          colorPalette.accent5,
          colorPalette.accent6
        ],
        borderColor: [
          colorPaletteSolid.primary,
          colorPaletteSolid.secondary,
          colorPaletteSolid.accent1,
          colorPaletteSolid.accent2,
          colorPaletteSolid.accent3,
          colorPaletteSolid.accent4,
          colorPaletteSolid.accent5,
          colorPaletteSolid.accent6
        ],
        borderWidth: 2
      }
    ]
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)'
      }}>
        <CircularProgress sx={{ color: 'white' }} size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)',
      minHeight: '100vh',
      p: 3
    }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 700, color: 'white', mb: 1 }}>
            Analytics Dashboard
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            Comprehensive insights and metrics
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel sx={{ color: 'white' }}>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              sx={{ 
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                '& .MuiSvgIcon-root': { color: 'white' }
              }}
            >
              <MenuItem value="7">7 Days</MenuItem>
              <MenuItem value="30">30 Days</MenuItem>
              <MenuItem value="90">90 Days</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh Data">
            <IconButton onClick={fetchAnalyticsData} sx={{ color: 'white' }}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Overview Cards */}
      {analytics && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
          <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
            <StatCard
              title="Total Users"
              value={analytics.totalUsers.toLocaleString()}
              subtitle={`${analytics.newUsersThisWeek} new this week`}
              icon={<People sx={{ color: 'white', fontSize: 28 }} />}
              trend={calculateTrend(userTrend)}
            />
          </Box>
          <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
            <StatCard
              title="Total Files"
              value={analytics.totalFiles.toLocaleString()}
              subtitle={`${analytics.filesUploadedToday} uploaded today`}
              icon={<FilePresent sx={{ color: 'white', fontSize: 28 }} />}
              trend={calculateTrend(uploadTrend)}
            />
          </Box>
          <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
            <StatCard
              title="Total Downloads"
              value={analytics.totalDownloads.toLocaleString()}
              subtitle={`${analytics.uniqueDownloaders} unique downloaders`}
              icon={<Download sx={{ color: 'white', fontSize: 28 }} />}
              trend={calculateTrend(downloadTrend)}
            />
          </Box>
          <Box sx={{ flex: '1 1 250px', minWidth: '250px' }}>
            <StatCard
              title="Storage Used"
              value={formatFileSize(analytics.totalStorage)}
              subtitle={`${analytics.storageUsagePercent.toFixed(1)}% of capacity`}
              icon={<Storage sx={{ color: 'white', fontSize: 28 }} />}
              trend={Math.round(analytics.storageUsagePercent - 40)} // Relative to a baseline
            />
          </Box>
        </Box>
      )}

      {/* Tabs for different analytics views */}
      <Paper sx={{ 
        bgcolor: 'rgba(255, 255, 255, 0.1)', 
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: 3
      }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ 
            borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
            '& .MuiTab-root': { color: 'rgba(255, 255, 255, 0.7)' },
            '& .Mui-selected': { color: 'white' },
            '& .MuiTabs-indicator': { backgroundColor: 'white' }
          }}
        >
          <Tab icon={<Timeline />} label="Trends" />
          <Tab icon={<PieChart />} label="Distribution" />
          <Tab icon={<BarChart />} label="Top Files" />
          <Tab icon={<People />} label="User Activity" />
        </Tabs>

        {/* Trends Tab */}
        {activeTab === 0 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 500px', minWidth: '500px' }}>
                <Paper sx={{ 
                  p: 3, 
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  height: 400
                }}>
                  <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                    User Registration Trend
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    {userTrend.length > 0 ? (
                      <Line 
                        data={lineChartData(userTrend, 'New Users', 'accent1')} 
                        options={chartOptions} 
                      />
                    ) : (
                      <EmptyDataMessage title="User Registration" />
                    )}
                  </Box>
                </Paper>
              </Box>
              <Box sx={{ flex: '1 1 500px', minWidth: '500px' }}>
                <Paper sx={{ 
                  p: 3, 
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  height: 400
                }}>
                  <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                    File Upload Trend
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    {uploadTrend.length > 0 ? (
                      <Line 
                        data={lineChartData(uploadTrend, 'Files Uploaded', 'accent2')} 
                        options={chartOptions} 
                      />
                    ) : (
                      <EmptyDataMessage title="File Upload" />
                    )}
                  </Box>
                </Paper>
              </Box>
              <Box sx={{ flex: '1 1 500px', minWidth: '500px' }}>
                <Paper sx={{ 
                  p: 3, 
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  height: 400
                }}>
                  <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                    Download Trend
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    {downloadTrend.length > 0 ? (
                      <Line 
                        data={lineChartData(downloadTrend, 'Downloads', 'accent3')} 
                        options={chartOptions} 
                      />
                    ) : (
                      <EmptyDataMessage title="Download" />
                    )}
                  </Box>
                </Paper>
              </Box>
              <Box sx={{ flex: '1 1 500px', minWidth: '500px' }}>
                <Paper sx={{ 
                  p: 3, 
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  height: 400
                }}>
                  <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                    Storage Usage Trend
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    {storageTrend.length > 0 ? (
                      <Line 
                        data={lineChartData(storageTrend.map(d => ({...d, value: d.value / (1024 * 1024)})), 'Storage (MB)', 'accent4')} 
                        options={chartOptions} 
                      />
                    ) : (
                      <EmptyDataMessage title="Storage Usage" />
                    )}
                  </Box>
                </Paper>
              </Box>
            </Box>
          </Box>
        )}

        {/* Distribution Tab */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 500px', minWidth: '500px' }}>
                <Paper sx={{ 
                  p: 3, 
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  height: 400
                }}>
                  <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                    File Type Distribution
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    {fileTypes.length > 0 ? (
                      <Pie data={pieChartData} options={{ ...chartOptions, plugins: { legend: { labels: { color: 'white' } } } }} />
                    ) : (
                      <EmptyDataMessage title="File Type" />
                    )}
                  </Box>
                </Paper>
              </Box>
              <Box sx={{ flex: '1 1 500px', minWidth: '500px' }}>
                <Paper sx={{ 
                  p: 3, 
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  height: 400
                }}>
                  <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                    Storage by File Type
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    {fileTypes.length > 0 ? (
                      <Doughnut 
                        data={{
                          ...pieChartData,
                          datasets: [{
                            ...pieChartData.datasets[0],
                            data: fileTypes.map(ft => ft.size / (1024 * 1024)) // Convert to MB
                          }]
                        }} 
                        options={{ ...chartOptions, plugins: { legend: { labels: { color: 'white' } } } }} 
                      />
                    ) : (
                      <EmptyDataMessage title="Storage Distribution" />
                    )}
                  </Box>
                </Paper>
              </Box>
            </Box>
          </Box>
        )}

        {/* Top Files Tab */}
        {activeTab === 2 && (
          <Box sx={{ p: 3 }}>
            <Paper sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <Typography variant="h6" sx={{ color: 'white', p: 3, pb: 2 }}>
                Most Downloaded Files
              </Typography>
              {topFiles.length > 0 ? (
                <List>
                  {topFiles.map((file, index) => (
                    <ListItem key={file.id} sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'white' }}>
                          {index + 1}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography sx={{ color: 'white', fontWeight: 600 }}>
                            {file.originalFilename}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                            <Chip 
                              label={`${file.downloadCount} downloads`} 
                              size="small" 
                              sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
                            />
                            <Chip 
                              label={formatFileSize(file.size)} 
                              size="small" 
                              sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'white' }}
                            />
                            <Chip 
                              label={file.owner} 
                              size="small" 
                              sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', color: 'white' }}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ p: 3, pt: 0 }}>
                  <EmptyDataMessage title="Downloaded Files" />
                </Box>
              )}
            </Paper>
          </Box>
        )}

        {/* User Activity Tab */}
        {activeTab === 3 && (
          <Box sx={{ p: 3 }}>
            <Paper sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <Typography variant="h6" sx={{ color: 'white', p: 3, pb: 2 }}>
                User Activity Overview
              </Typography>
              {userActivity.length > 0 ? (
                <List>
                  {userActivity.slice(0, 10).map((user) => (
                    <ListItem key={user.username} sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', color: 'white' }}>
                          {user.username.charAt(0).toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography sx={{ color: 'white', fontWeight: 600 }}>
                              {user.username}
                            </Typography>
                            <Chip 
                              label={user.isActive ? 'Active' : 'Inactive'} 
                              size="small" 
                              sx={{ 
                                bgcolor: user.isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)', 
                              color: 'white' 
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                            Files: {user.filesUploaded} • Storage: {formatFileSize(user.storageUsed)}
                          </Typography>
                          <Box sx={{ mt: 1, width: '100%' }}>
                            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                              Storage Usage
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.min((user.storageUsed / (100 * 1024 * 1024)) * 100, 100)}
                              sx={{ 
                                mt: 0.5,
                                bgcolor: 'rgba(255, 255, 255, 0.1)',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: (user.storageUsed / (100 * 1024 * 1024)) > 0.8 ? 'gray' : 'white'
                                }
                              }}
                            />
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
              ) : (
                <Box sx={{ p: 3, pt: 0 }}>
                  <EmptyDataMessage title="User Activity" />
                </Box>
              )}
            </Paper>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default AnalyticsPage;