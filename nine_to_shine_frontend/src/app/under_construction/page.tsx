'use client';

import { Box, Stack, Typography, Paper } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';
import Layout from '@/components/Layout';

export default function InArbeitPage() {
  return (
    <Layout>
      <Box
        sx={{
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            maxWidth: 480,
            width: '100%',
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
          }}
        >
          {/* „Logo“ / Header */}
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            justifyContent="center"
            sx={{ mb: 2 }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              <ConstructionIcon fontSize="large" />
            </Box>
          </Stack>
          <Typography variant="h5" component="h1">
            Work in Progress...
          </Typography>
          <Typography variant="h6" gutterBottom>
            Muasi no mochn ;)
          </Typography>
        </Paper>
      </Box>
    </Layout>
  );
}
