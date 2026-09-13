import { Box, Skeleton } from '@mui/material';

export default function DashboardSkeleton() {
  return (
    <Box
      role="status"
      aria-label="Dashboard wird geladen"
      aria-busy="true"
      sx={{ width: '100%', maxWidth: 1000, mx: 'auto' }}
    >
      <Skeleton
        aria-hidden="true"
        variant="text"
        width={108}
        height={24}
        sx={{ mb: { xs: 1.5, sm: 2 } }}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            md: 'minmax(0, 5fr) minmax(0, 7fr)',
          },
          gap: { xs: 1.5, sm: 2, md: 2.5 },
          alignItems: 'stretch',
        }}
      >
        <Skeleton
          aria-hidden="true"
          variant="rounded"
          sx={{
            height: '100%',
            minHeight: { xs: 300, sm: 340, md: 390 },
            borderRadius: 2.5,
          }}
        />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              md: '1fr',
            },
            gridAutoRows: '1fr',
            gap: { xs: 1.5, sm: 2, md: 2.5 },
            minWidth: 0,
            height: '100%',
            '@media (max-width: 359.95px)': {
              gridTemplateColumns: 'minmax(0, 1fr)',
            },
          }}
        >
          {[0, 1].map((index) => (
            <Skeleton
              key={index}
              aria-hidden="true"
              variant="rounded"
              sx={{
                height: '100%',
                minHeight: { xs: 150, sm: 170, md: 0 },
                borderRadius: 2.5,
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
