import React from 'react';
import { Typography, Paper, Box } from '@mui/material';

const HomePage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome to KMRL Train Scheduler
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography>
          This is the home page. TODO: Implement the dashboard with quick actions, 
          recent bookings, schedule overview, etc.
        </Typography>
      </Paper>
    </Box>
  );
};

export default HomePage;