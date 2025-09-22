import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  CloudUpload,
  Security,
  Share,
  Analytics,
  FolderSpecial,
  Speed,
  AdminPanelSettings,
  Backup,
  Lock,
  Group,
  Close,
  CheckCircle,
  Code,
  Storage,
  Search,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);

  const features = [
    {
      icon: <CloudUpload sx={{ fontSize: 40, color: '#ffffff' }} />,
      title: 'Secure File Upload',
      description: 'Upload files securely with advanced encryption and deduplication technology.',
    },
    {
      icon: <FolderSpecial sx={{ fontSize: 40, color: '#ffffff' }} />,
      title: 'Smart Organization',
      description: 'Organize files in folders with intelligent categorization and search capabilities.',
    },
    {
      icon: <Share sx={{ fontSize: 40, color: '#ffffff' }} />,
      title: 'Easy Sharing',
      description: 'Share files and folders with users or generate secure public links.',
    },
    {
      icon: <Speed sx={{ fontSize: 40, color: '#ffffff' }} />,
      title: 'Deduplication',
      description: 'Advanced file deduplication saves storage space and reduces costs.',
    },
    {
      icon: <Analytics sx={{ fontSize: 40, color: '#ffffff' }} />,
      title: 'Advanced Analytics',
      description: 'Comprehensive analytics and reporting for file usage and storage trends.',
    },
    {
      icon: <AdminPanelSettings sx={{ fontSize: 40, color: '#ffffff' }} />,
      title: 'Admin Control',
      description: 'Powerful admin panel for user management and system monitoring.',
    },
  ];

  const keyBenefits = [
    'Enterprise-grade security with encryption',
    'Intelligent file deduplication',
    'Scalable storage architecture',
    'Real-time collaboration features',
    'Comprehensive audit trails',
    'Multi-user access control',
  ];

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #2d2d2d 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background decorative elements */}
      <Box sx={{
        position: 'absolute',
        top: -50,
        right: -50,
        width: 200,
        height: 200,
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(10px)',
      }} />
      <Box sx={{
        position: 'absolute',
        bottom: -100,
        left: -100,
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(10px)',
      }} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header Section */}
        <Box sx={{ pt: 8, pb: 6, textAlign: 'center' }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '3rem', md: '4.5rem' },
              fontWeight: 800,
              background: 'linear-gradient(45deg, #ffffff 30%, #f5f5f5 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
              textShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
            }}
          >
            FileFoundry
          </Typography>
          
          <Typography
            variant="h4"
            sx={{
              color: 'rgba(255, 255, 255, 0.9)',
              mb: 3,
              fontWeight: 300,
              fontSize: { xs: '1.5rem', md: '2rem' },
            }}
          >
            The Ultimate File Management & Storage Solution
          </Typography>

          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              mb: 4,
              maxWidth: 600,
              mx: 'auto',
              lineHeight: 1.6,
            }}
          >
            Secure, intelligent, and collaborative file storage with advanced deduplication, 
            comprehensive analytics, and enterprise-grade security features.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/auth')}
              sx={{
                py: 2,
                px: 4,
                fontSize: '1.2rem',
                fontWeight: 600,
                borderRadius: 3,
                background: 'linear-gradient(45deg, #ffffff 30%, #f0f0f0 90%)',
                color: '#000000',
                boxShadow: '0 6px 20px rgba(255, 255, 255, 0.2)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #f0f0f0 30%, #e0e0e0 90%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(255, 255, 255, 0.3)',
                },
                transition: 'all 0.3s ease',
              }}
              startIcon={<Lock />}
            >
              Get Started
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              onClick={() => setLearnMoreOpen(true)}
              sx={{
                py: 2,
                px: 4,
                fontSize: '1.2rem',
                fontWeight: 600,
                borderRadius: 3,
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                background: 'linear-gradient(45deg, rgba(25, 118, 210, 0.1) 30%, rgba(66, 165, 245, 0.1) 90%)',
                boxShadow: '0 3px 5px 2px rgba(25, 118, 210, .2)',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': {
                    boxShadow: '0 3px 5px 2px rgba(25, 118, 210, .2)',
                  },
                  '50%': {
                    boxShadow: '0 6px 10px 4px rgba(25, 118, 210, .4)',
                    transform: 'translateY(-2px)',
                  },
                  '100%': {
                    boxShadow: '0 3px 5px 2px rgba(25, 118, 210, .2)',
                  },
                },
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  transform: 'translateY(-3px)',
                  boxShadow: '0 8px 15px 5px rgba(25, 118, 210, .3)',
                },
                transition: 'all 0.3s ease',
              }}
              startIcon={<Analytics />}
            >
              📚 Learn More
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              onClick={() => setAdminLoginOpen(true)}
              sx={{
                py: 2,
                px: 4,
                fontSize: '1.2rem',
                fontWeight: 600,
                borderRadius: 3,
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                background: 'linear-gradient(45deg, rgba(255, 152, 0, 0.1) 30%, rgba(255, 193, 7, 0.1) 90%)',
                boxShadow: '0 3px 5px 2px rgba(255, 152, 0, .2)',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  transform: 'translateY(-3px)',
                  boxShadow: '0 8px 15px 5px rgba(255, 152, 0, .3)',
                },
                transition: 'all 0.3s ease',
              }}
              startIcon={<AdminPanelSettings />}
            >
              🔐 Admin Login
            </Button>
          </Stack>
        </Box>

        {/* Features Section */}
        <Box sx={{ mb: 8 }}>
          <Typography
            variant="h3"
            sx={{
              textAlign: 'center',
              color: 'white',
              mb: 6,
              fontWeight: 700,
            }}
          >
            Powerful Features
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
            {features.map((feature, index) => (
              <Card
                key={index}
                sx={{
                  height: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 30px rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  },
                }}
              >
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Box sx={{ mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography
                    variant="h6"
                    sx={{
                      color: 'white',
                      mb: 2,
                      fontWeight: 600,
                    }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      lineHeight: 1.6,
                    }}
                  >
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>

        {/* Project Overview Section */}
        <Paper
          sx={{
            p: 6,
            mb: 8,
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(15px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 4,
          }}
        >
          <Typography
            variant="h3"
            sx={{
              textAlign: 'center',
              color: 'white',
              mb: 4,
              fontWeight: 700,
            }}
          >
            About FileFoundry
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 4, alignItems: 'center' }}>
            <Box>
              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '1.1rem',
                  lineHeight: 1.8,
                  mb: 3,
                }}
              >
                FileFoundry is a cutting-edge file management system built with modern web technologies. 
                It combines secure cloud storage with intelligent features like file deduplication, 
                advanced analytics, and seamless collaboration tools.
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '1.1rem',
                  lineHeight: 1.8,
                  mb: 3,
                }}
              >
                Our platform features a robust Go backend with PostgreSQL database, ensuring high performance 
                and reliability. The React TypeScript frontend provides an intuitive user experience with 
                Material-UI components for a professional look and feel.
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '1.1rem',
                  lineHeight: 1.8,
                }}
              >
                Whether you're an individual user or managing enterprise-level storage, FileFoundry 
                scales to meet your needs with powerful admin tools, comprehensive reporting, and 
                enterprise-grade security features.
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="h6"
                sx={{
                  color: 'white',
                  mb: 3,
                  fontWeight: 600,
                }}
              >
                Key Benefits
              </Typography>
              
              <Stack spacing={1.5}>
                {keyBenefits.map((benefit, index) => (
                  <Chip
                    key={index}
                    label={benefit}
                    variant="outlined"
                    sx={{
                      color: 'white',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.2)',
                      },
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Box>
        </Paper>

        {/* Technical Stack Section */}
        <Paper
          sx={{
            p: 6,
            mb: 8,
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(15px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 4,
          }}
        >
          <Typography
            variant="h4"
            sx={{
              textAlign: 'center',
              color: 'white',
              mb: 4,
              fontWeight: 700,
            }}
          >
            Built with Modern Technology
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 4 }}>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  color: 'white',
                  mb: 2,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Backup /> Backend Technologies
              </Typography>
              <Stack spacing={1}>
                <Chip label="Go (Golang)" variant="filled" sx={{ background: '#000000', color: 'white', border: '1px solid #666' }} />
                <Chip label="Gin Web Framework" variant="filled" sx={{ background: '#1a1a1a', color: 'white', border: '1px solid #666' }} />
                <Chip label="PostgreSQL Database" variant="filled" sx={{ background: '#2d2d2d', color: 'white', border: '1px solid #666' }} />
                <Chip label="GORM ORM" variant="filled" sx={{ background: '#000000', color: 'white', border: '1px solid #666' }} />
                <Chip label="JWT Authentication" variant="filled" sx={{ background: '#1a1a1a', color: 'white', border: '1px solid #666' }} />
                <Chip label="Redis Caching" variant="filled" sx={{ background: '#2d2d2d', color: 'white', border: '1px solid #666' }} />
              </Stack>
            </Box>

            <Box>
              <Typography
                variant="h6"
                sx={{
                  color: 'white',
                  mb: 2,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Group /> Frontend Technologies
              </Typography>
              <Stack spacing={1}>
                <Chip label="React 18" variant="filled" sx={{ background: '#000000', color: 'white', border: '1px solid #666' }} />
                <Chip label="TypeScript" variant="filled" sx={{ background: '#1a1a1a', color: 'white', border: '1px solid #666' }} />
                <Chip label="Material-UI (MUI)" variant="filled" sx={{ background: '#2d2d2d', color: 'white', border: '1px solid #666' }} />
                <Chip label="React Router" variant="filled" sx={{ background: '#000000', color: 'white', border: '1px solid #666' }} />
                <Chip label="Docker Containerization" variant="filled" sx={{ background: '#1a1a1a', color: 'white', border: '1px solid #666' }} />
                <Chip label="Responsive Design" variant="filled" sx={{ background: '#2d2d2d', color: 'white', border: '1px solid #666' }} />
              </Stack>
            </Box>
          </Box>
        </Paper>

        {/* Call to Action Section */}
        <Box sx={{ textAlign: 'center', pb: 8 }}>
          <Typography
            variant="h4"
            sx={{
              color: 'white',
              mb: 3,
              fontWeight: 700,
            }}
          >
            Ready to Get Started?
          </Typography>
          
          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              mb: 4,
              maxWidth: 500,
              mx: 'auto',
            }}
          >
            Join thousands of users who trust FileFoundry for their file management needs.
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/auth')}
            sx={{
              py: 3,
              px: 6,
              fontSize: '1.3rem',
              fontWeight: 700,
              borderRadius: 3,
              background: 'linear-gradient(45deg, #ffffff 30%, #f0f0f0 90%)',
              color: '#000000',
              boxShadow: '0 8px 25px rgba(255, 255, 255, 0.2)',
              '&:hover': {
                background: 'linear-gradient(45deg, #f0f0f0 30%, #e0e0e0 90%)',
                transform: 'translateY(-3px)',
                boxShadow: '0 12px 35px rgba(255, 255, 255, 0.3)',
              },
              transition: 'all 0.3s ease',
            }}
            startIcon={<CloudUpload />}
          >
            Start Using FileFoundry
          </Button>
        </Box>

        {/* Project Overview Section */}
        <Paper sx={{ 
          p: 4, 
          mt: 8, 
          mb: 4,
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(15px)',
          borderRadius: 4,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'white'
        }}>
          <Typography variant="h4" component="h2" gutterBottom sx={{ textAlign: 'center', fontWeight: 'bold', color: 'white' }}>
            BalkanID Full Stack Engineering Intern — Capstone Hiring Task
          </Typography>
          
          <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 3, color: 'rgba(255, 255, 255, 0.8)' }}>
            Production-Grade File Vault System Implementation
          </Typography>

          <Typography variant="body1" paragraph sx={{ mb: 3, textAlign: 'center', color: 'rgba(255, 255, 255, 0.9)' }}>
            <strong>Overview:</strong> Build a secure file vault system that supports efficient storage, powerful search, and controlled file sharing. 
            This project evaluates your ability to design and implement scalable APIs, build backend services in Go, 
            model relational data in PostgreSQL, and develop a modern frontend application.
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mb: 4 }}>
            <Box sx={{ flex: '1 1 calc(50% - 2rem)', minWidth: '300px' }}>
              <Typography variant="h6" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
                <Code sx={{ verticalAlign: 'middle', mr: 1, color: 'rgba(255, 255, 255, 0.8)' }} />
                Technology Stack
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#ffffff' }} /></ListItemIcon>
                  <ListItemText primary="Backend: Go (Golang)" sx={{ color: 'rgba(255, 255, 255, 0.9)' }} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#ffffff' }} /></ListItemIcon>
                  <ListItemText primary="API Layer: REST + GraphQL (preferred)" sx={{ color: 'rgba(255, 255, 255, 0.9)' }} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#ffffff' }} /></ListItemIcon>
                  <ListItemText primary="Database: PostgreSQL" sx={{ color: 'rgba(255, 255, 255, 0.9)' }} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#ffffff' }} /></ListItemIcon>
                  <ListItemText primary="Frontend: React.js with TypeScript" sx={{ color: 'rgba(255, 255, 255, 0.9)' }} />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckCircle sx={{ color: '#ffffff' }} /></ListItemIcon>
                  <ListItemText primary="Containerization: Docker Compose" sx={{ color: 'rgba(255, 255, 255, 0.9)' }} />
                </ListItem>
              </List>
            </Box>

            <Box sx={{ flex: '1 1 calc(50% - 2rem)', minWidth: '300px' }}>
              <Typography variant="h6" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
                <Storage sx={{ verticalAlign: 'middle', mr: 1, color: 'rgba(255, 255, 255, 0.8)' }} />
                Core Features Implemented
              </Typography>
              <List dense>
                {[
                  'File Deduplication (SHA-256)',
                  'Multi-file Drag & Drop Upload',
                  'MIME Type Validation',
                  'Folder Organization',
                  'Public/Private/User Sharing',
                  'Advanced Search & Filtering',
                  'Rate Limiting & Storage Quotas',
                  'Admin Panel with Analytics',
                  'Audit Logs & Activity Tracking',
                  'Real-time Upload Progress',
                  'Grid/List View Toggle',
                  'Responsive Design'
                ].map((feature, index) => (
                  <ListItem key={index}>
                    <ListItemIcon><CheckCircle sx={{ color: '#ffffff', fontSize: '1rem' }} /></ListItemIcon>
                    <ListItemText 
                      primary={feature}
                      primaryTypographyProps={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.9)' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>

          <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <Box sx={{ flex: '1 1 calc(33.333% - 2rem)', minWidth: '250px' }}>
              <Typography variant="h6" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
                🎯 Key Objectives
              </Typography>
              <Typography variant="body2" paragraph sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Design and implement scalable APIs, build backend services in Go Golang, 
                model and query relational data in PostgreSQL, develop a modern user-friendly frontend application, 
                and demonstrate good software design, documentation, and engineering practices.
              </Typography>
            </Box>

            <Box sx={{ flex: '1 1 calc(33.333% - 2rem)', minWidth: '250px' }}>
              <Typography variant="h6" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
                🚀 Bonus Features
              </Typography>
              <Typography variant="body2" paragraph sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                UAT testing with automation, real-time updates, file previews, RBAC implementation, 
                improved frontend UX with progress bars, audit logs for file activity, 
                and additional thoughtful features for usability, security, and performance.
              </Typography>
            </Box>

            <Box sx={{ flex: '1 1 calc(33.333% - 2rem)', minWidth: '250px' }}>
              <Typography variant="h6" gutterBottom sx={{ color: 'white', fontWeight: 'bold' }}>
                📊 Evaluation Criteria
              </Typography>
              <Typography variant="body2" paragraph sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                <strong>Correctness:</strong> Functional requirements met<br/>
                <strong>Code Quality:</strong> Clean, maintainable, modular<br/>
                <strong>Design Choices:</strong> Sensible architecture<br/>
                <strong>UI/UX:</strong> Polished and intuitive<br/>
                <strong>Documentation:</strong> Easy setup and understanding<br/>
                <strong>Creativity:</strong> Beyond requirements
              </Typography>
            </Box>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              <strong>Deadline:</strong> 22nd September 2025, 11:59 PM IST • 
              <strong>Platform:</strong> GitHub Classrooms • 
              <strong>Focus:</strong> Production-Grade Implementation
            </Typography>
          </Box>
        </Paper>

        {/* Learn More Dialog */}
        <Dialog
          open={learnMoreOpen}
          onClose={() => setLearnMoreOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              minHeight: '80vh',
              maxHeight: '90vh',
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            backgroundColor: '#000000',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white'
          }}>
            <Typography variant="h6" sx={{ color: 'white' }}>📚 BalkanID Capstone Project Documentation</Typography>
            <IconButton
              onClick={() => setLearnMoreOpen(false)}
              sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          
          <DialogContent sx={{ p: 0 }}>
            <iframe
              src="https://docs.google.com/document/d/1cFsoTcaIGDyxV54NbxgEs7B0T9SxcvaIT0JRFps2bzA/edit?tab=t.0"
              style={{
                width: '100%',
                height: '70vh',
                border: 'none'
              }}
              title="BalkanID Capstone Project Documentation"
            />
          </DialogContent>
          
          <DialogActions sx={{ p: 2 }}>
            <Button
              onClick={() => setLearnMoreOpen(false)}
              variant="contained"
              sx={{ 
                background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
              }}
            >
              Close Documentation
            </Button>
          </DialogActions>
        </Dialog>

        {/* Admin Login Dialog */}
        <Dialog
          open={adminLoginOpen}
          onClose={() => setAdminLoginOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            backgroundColor: '#000000',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white'
          }}>
            <Typography variant="h6" sx={{ color: 'white' }}>🔐 Admin Credentials</Typography>
            <IconButton
              onClick={() => setAdminLoginOpen(false)}
              sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          
          <DialogContent sx={{ p: 3 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <AdminPanelSettings sx={{ fontSize: 64, color: '#ff9800', mb: 2 }} />
              <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
                Admin Access Required
              </Typography>
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 3 }}>
                For admin credentials and setup instructions, please check the repository README file.
              </Typography>
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button 
              onClick={() => setAdminLoginOpen(false)}
              sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
            >
              Close
            </Button>
            <Button 
              variant="contained"
              onClick={() => window.open('https://github.com/BalkanID-University/vit-2026-capstone-internship-hiring-task-Thanush-41', '_blank')}
              sx={{
                background: 'linear-gradient(45deg, #ff9800 30%, #ffb74d 90%)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(45deg, #f57c00 30%, #ff9800 90%)',
                }
              }}
            >
              Go to Repository
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default HomePage;