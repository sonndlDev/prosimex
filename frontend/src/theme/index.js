import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        primary: {
            main: '#0d47a1', // Deep Blue
            light: '#5472d3',
            dark: '#002171',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#2e7d32', // Forest Green
            light: '#60ad5e',
            dark: '#005005',
            contrastText: '#ffffff',
        },
        background: {
            default: '#f4f6f8',
            paper: '#ffffff',
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h6: {
            fontWeight: 600,
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    borderRadius: 8,
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.04)',
                },
            },
        },
    },
});

export default theme;
