import { Box, Typography } from '@mui/material';

type PageTitleProps = {
  title: string;
  subtitle?: string;
};

export default function PageTitle({ title, subtitle }: PageTitleProps) {
  return (
    <Box>
      <Typography
        component="h1"
        sx={{
          color: 'text.primary',
          fontSize: { xs: '2.5rem', sm: '3.25rem' },
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1.05,
        }}
      >
        {title}
      </Typography>
      <Box
        aria-hidden="true"
        sx={{
          width: 40,
          height: 6,
          mt: 1.25,
          borderRadius: 999,
          bgcolor: 'primary.main',
        }}
      />
      {subtitle && (
        <Typography
          color="text.secondary"
          sx={{ mt: 1.75, fontSize: { xs: '1rem', sm: '1.15rem' } }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}
