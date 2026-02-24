import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    IconButton,
    Typography,
    Box,
    Toolbar,
    CircularProgress,
    Alert,
    Tooltip,
    TextField,
    InputAdornment
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';

export default function GenericTable({ 
    title, 
    data, 
    columns, 
    isLoading, 
    error, 
    onAdd, 
    onEdit, 
    onDelete,
    actionColWidth = 100 
}) {
    const [searchTerm, setSearchTerm] = useState('');

    if (isLoading) {
        return (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={8} gap={2}>
                <CircularProgress size={40} thickness={4} />
                <Typography color="textSecondary" variant="body2">Đang tải dữ liệu...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Alert 
                severity="error" 
                variant="outlined"
                sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'error.light', bgcolor: 'rgba(239, 68, 68, 0.02)' }}
            >
                {error.message || 'Lỗi khi tải dữ liệu'}
            </Alert>
        );
    }

    const filteredData = data?.filter(row => 
        Object.values(row).some(val => 
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    return (
        <Paper elevation={0} sx={{ 
            width: '100%', 
            overflow: 'hidden', 
            borderRadius: '20px', 
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper'
        }}>
            <Toolbar sx={{ 
                py: 2, 
                px: 3, 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: 2,
                justifyContent: 'space-between'
            }}>
                <Box sx={{ flex: '1 1 auto' }}>
                    {typeof title === 'string' ? (
                        <Typography sx={{ fontWeight: 700 }} variant="h5" component="div">
                            {title}
                        </Typography>
                    ) : (
                        title
                    )}
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <TextField
                        size="small"
                        placeholder="Tìm kiếm..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" color="disabled" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ 
                            minWidth: { xs: '100%', sm: 240 },
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '10px',
                                bgcolor: 'background.default'
                            }
                        }}
                    />
                    {onAdd && (
                        <Button 
                            variant="contained" 
                            color="primary" 
                            startIcon={<AddIcon />} 
                            onClick={onAdd}
                            sx={{ 
                                whiteSpace: 'nowrap', 
                                px: 3,
                                py: 1,
                                borderRadius: '10px'
                            }}
                        >
                            Thêm mới
                        </Button>
                    )}
                </Box>
            </Toolbar>
            
            <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)' }}>
                <Table stickyHeader size="medium">
                    <TableHead>
                        <TableRow>
                            <TableCell width={60} sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>STT</TableCell>
                            {columns.map((column) => (
                                <TableCell 
                                    key={column.id} 
                                    align={column.align || 'left'} 
                                    sx={{ 
                                        minWidth: column.minWidth,
                                        fontWeight: 700,
                                        bgcolor: 'background.paper',
                                        color: 'text.secondary',
                                        fontSize: '0.8rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}
                                >
                                    {column.label}
                                </TableCell>
                            ))}
                            {(onEdit || onDelete) && (
                                <TableCell 
                                    align="center" 
                                    width={actionColWidth}
                                    sx={{ 
                                        fontWeight: 700, 
                                        bgcolor: 'background.paper',
                                        color: 'text.secondary',
                                        fontSize: '0.8rem',
                                        textTransform: 'uppercase'
                                    }}
                                >
                                    Thao tác
                                </TableCell>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredData?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length + 2} align="center" sx={{ py: 10 }}>
                                    <Box sx={{ color: 'text.disabled', textAlign: 'center' }}>
                                        <SearchIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                                        <Typography variant="body1">Không có dữ liệu phù hợp</Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData?.map((row, index) => (
                                <TableRow 
                                    hover 
                                    key={row.id || index}
                                    sx={{ 
                                        '&:last-child td, &:last-child th': { border: 0 },
                                        transition: 'background-color 0.2s ease',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <TableCell sx={{ color: 'text.secondary', fontWeight: 500 }}>{index + 1}</TableCell>
                                    {columns.map((column) => {
                                        const value = row[column.id];
                                        return (
                                            <TableCell key={column.id} align={column.align || 'left'} sx={{ fontWeight: 500 }}>
                                                {column.format ? column.format(value, row) : value}
                                            </TableCell>
                                        );
                                    })}
                                    {(onEdit || onDelete) && (
                                        <TableCell align="center">
                                            <Box display="flex" justifyContent="center" gap={1}>
                                                {onEdit && (
                                                    <Tooltip title="Chỉnh sửa">
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={(e) => { e.stopPropagation(); onEdit(row); }}
                                                            sx={{ 
                                                                color: 'primary.main',
                                                                bgcolor: 'rgba(37, 99, 235, 0.05)',
                                                                '&:hover': { bgcolor: 'rgba(37, 99, 235, 0.12)' }
                                                            }}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                                {onDelete && (
                                                    <Tooltip title="Xóa">
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={(e) => { e.stopPropagation(); onDelete(row); }}
                                                            sx={{ 
                                                                color: 'error.main',
                                                                bgcolor: 'rgba(239, 68, 68, 0.05)',
                                                                '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.12)' }
                                                            }}
                                                        >
                                                            <DeleteIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </Box>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}
