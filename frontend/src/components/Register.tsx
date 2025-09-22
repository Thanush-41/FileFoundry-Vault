import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  Divider,
  Paper,
  Container,
  AppBar,
  Toolbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Close, AdminPanelSettings } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { RegisterInput } from '../types';

const StyledPaper = styled(Paper)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)',
  backgroundColor: theme.palette.background.default,
}));

const StyledCard = styled(Card)(({ theme }) => ({
  minWidth: 450,
  padding: theme.spacing(3),
  borderRadius: theme.spacing(2),
  boxShadow: '0 8px 32px rgba(255, 255, 255, 0.1)',
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
}));

interface RegisterProps {
  onSwitchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const { register, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState<RegisterInput>({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formErrors, setFormErrors] = useState<Partial<RegisterInput & { confirmPassword: string }>>({});
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);

  const handleChange = (field: keyof RegisterInput | 'confirmPassword') => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    
    if (field === 'confirmPassword') {
      setConfirmPassword(value);
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
    
    // Clear global error
    if (error) {
      clearError();
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<RegisterInput & { confirmPassword: string }> = {};
    
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await register(formData);
      // Redirect will be handled by the auth context/router
    } catch (error) {
      // Error is already handled by the auth context
      console.error('Registration failed:', error);
    }
  };

  return (
    <>
      <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            FileFoundry
          </Typography>
          <Button 
            color="inherit" 
            onClick={() => setLearnMoreOpen(true)}
            sx={{
              mr: 2,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              fontWeight: 600,
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.2)',
                transform: 'scale(1.05)',
                boxShadow: '0 4px 15px rgba(255, 255, 255, 0.1)',
              },
              transition: 'all 0.3s ease',
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': {
                  boxShadow: '0 0 0 0 rgba(255, 255, 255, 0.3)',
                },
                '70%': {
                  boxShadow: '0 0 0 10px rgba(255, 255, 255, 0)',
                },
                '100%': {
                  boxShadow: '0 0 0 0 rgba(255, 255, 255, 0)',
                },
              },
            }}
          >
            Learn More
          </Button>
          <Button 
            color="inherit" 
            onClick={() => setAdminLoginOpen(true)}
            sx={{
              mr: 2,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              fontWeight: 600,
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.2)',
                transform: 'scale(1.05)',
                boxShadow: '0 4px 15px rgba(255, 255, 255, 0.1)',
              },
              transition: 'all 0.3s ease',
            }}
            startIcon={<AdminPanelSettings />}
          >
            Admin Login
          </Button>
        </Toolbar>
      </AppBar>

      <StyledPaper>
        <Container maxWidth="sm">
          <StyledCard>
            <CardContent>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
                  FileFoundry
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Create your account
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    label="First Name"
                    variant="outlined"
                    value={formData.firstName}
                    onChange={handleChange('firstName')}
                    error={!!formErrors.firstName}
                    helperText={formErrors.firstName}
                    autoComplete="given-name"
                  />
                  <TextField
                    fullWidth
                    label="Last Name"
                    variant="outlined"
                    value={formData.lastName}
                    onChange={handleChange('lastName')}
                    error={!!formErrors.lastName}
                    helperText={formErrors.lastName}
                    autoComplete="family-name"
                  />
                </Box>

                <TextField
                  fullWidth
                  label="Username"
                  variant="outlined"
                  margin="normal"
                  value={formData.username}
                  onChange={handleChange('username')}
                  error={!!formErrors.username}
                  helperText={formErrors.username}
                  autoComplete="username"
                />

                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  variant="outlined"
                  margin="normal"
                  value={formData.email}
                  onChange={handleChange('email')}
                  error={!!formErrors.email}
                  helperText={formErrors.email}
                  autoComplete="email"
                />

                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  variant="outlined"
                  margin="normal"
                  value={formData.password}
                  onChange={handleChange('password')}
                  error={!!formErrors.password}
                  helperText={formErrors.password}
                  autoComplete="new-password"
                />

                <TextField
                  fullWidth
                  label="Confirm Password"
                  type="password"
                  variant="outlined"
                  margin="normal"
                  value={confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  error={!!formErrors.confirmPassword}
                  helperText={formErrors.confirmPassword}
                  autoComplete="new-password"
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={isLoading}
                  sx={{ mt: 3, mb: 2 }}
                >
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2">
                  Already have an account?{' '}
                  <Link
                    component="button"
                    variant="body2"
                    onClick={onSwitchToLogin}
                    sx={{ cursor: 'pointer', textDecoration: 'none' }}
                  >
                    Sign in
                  </Link>
                </Typography>
              </Box>
            </CardContent>
          </StyledCard>
        </Container>
      </StyledPaper>

      <Dialog
        open={learnMoreOpen}
        onClose={() => setLearnMoreOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: '90vh',
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: '#000000',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'white',
          fontWeight: 600,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          📚 BalkanID Capstone Task - Learn More
          <IconButton
            onClick={() => setLearnMoreOpen(false)}
            sx={{ color: 'rgba(255, 255, 255, 0.8)' }}
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
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: '#000000',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'white',
          fontWeight: 600,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          🔐 Admin Credentials
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
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.2)',
              }
            }}
          >
            Go to Repository
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};