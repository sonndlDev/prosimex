import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
    Box, Card, CardContent, Typography, TextField, Button, Alert, 
    InputAdornment, IconButton, CircularProgress, Avatar 
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ConstructionIcon from '@mui/icons-material/Construction';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(username, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box 
            sx={{ 
                minHeight: '100vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                background: '#0f172a',
            }}
        >
            <Box sx={{ 
                position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', 
                background: 'radial-gradient(circle, rgba(37, 99, 235, 0.4) 0%, transparent 70%)',
                filter: 'blur(100px)',
                zIndex: 0
            }} />
            <Box sx={{ 
                position: 'absolute', bottom: '-10%', right: '-10%', width: '50%', height: '50%', 
                background: 'radial-gradient(circle, rgba(124, 58, 237, 0.3) 0%, transparent 70%)',
                filter: 'blur(100px)',
                zIndex: 0
            }} />

            <Card className="glass-effect" sx={{ 
                maxWidth: 450, 
                width: '100%', 
                mx: 2, 
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', 
                borderRadius: '32px',
                zIndex: 1,
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: 'rgba(255, 255, 255, 0.05) !important'
            }}>
                <CardContent sx={{ p: { xs: 4, sm: 6 } }}>
                    <Box textAlign="center" mb={5}>
                        <Avatar sx={{ 
                            width: 64, height: 64, bgcolor: 'primary.main', mx: 'auto', mb: 2,
                            boxShadow: '0 8px 16px rgba(37, 99, 235, 0.4)'
                        }}>
                            <ConstructionIcon fontSize="large" />
                        </Avatar>
                        <Typography variant="h4" fontWeight={800} sx={{ color: 'white', letterSpacing: '-0.5px' }} gutterBottom>
                            PROSIMEX <span style={{ color: '#60a5fa' }}>MES</span>
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>
                            Hệ thống điều hành sản xuất chuyên nghiệp
                        </Typography>
                    </Box>

                    {error && (
                        <Alert 
                            severity="error" 
                            variant="filled" 
                            sx={{ mb: 3, borderRadius: '12px', bgcolor: 'rgba(239, 68, 68, 0.8)' }}
                        >
                            {error}
                        </Alert>
                    )}

                    <form onSubmit={handleLogin}>
                        <TextField
                            fullWidth
                            label="Tên đăng nhập"
                            variant="outlined"
                            margin="normal"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={loading}
                            required
                            sx={{ 
                                '& .MuiOutlinedInput-root': { 
                                    color: 'white',
                                    borderRadius: '16px',
                                    bgcolor: 'rgba(255, 255, 255, 0.03)',
                                    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                },
                                '& .MuiInputLabel-root': { 
                                    color: 'rgba(255,255,255,0.5)',
                                    '&.Mui-focused': { color: 'primary.light' }
                                }
                            }}
                        />
                        <TextField
                            fullWidth
                            label="Mật khẩu"
                            type={showPassword ? 'text' : 'password'}
                            variant="outlined"
                            margin="normal"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            required
                            sx={{ 
                                '& .MuiOutlinedInput-root': { 
                                    color: 'white',
                                    borderRadius: '16px',
                                    bgcolor: 'rgba(255, 255, 255, 0.03)',
                                    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                },
                                '& .MuiInputLabel-root': { 
                                    color: 'rgba(255,255,255,0.5)',
                                    '&.Mui-focused': { color: 'primary.light' }
                                }
                            }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                            sx={{ color: 'rgba(255,255,255,0.3)' }}
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            color="primary"
                            size="large"
                            disabled={loading}
                            sx={{ 
                                mt: 4, 
                                mb: 2, 
                                py: 1.8, 
                                borderRadius: '16px',
                                fontWeight: 700,
                                fontSize: '1rem',
                                boxShadow: '0 10px 20px -5px rgba(37, 99, 235, 0.4)',
                                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                            }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Đăng nhập'}
                        </Button>
                        
                        <Typography variant="body2" textAlign="center" sx={{ color: 'rgba(255, 255, 255, 0.4)', mt: 3 }}>
                            © 2026 Prosimex. All rights reserved.
                        </Typography>
                    </form>
                </CardContent>
            </Card>
        </Box>
    );
}
