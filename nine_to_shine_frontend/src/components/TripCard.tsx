import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import dayjs from 'dayjs';

import { formatCurrency } from '@/common/misc';

interface TripCardProps {
  date: Date;
  description: string;
  totalAmount: number;
  onClick?: () => void;
}

export default function TripCard({
  date,
  description,
  totalAmount,
  onClick,
}: TripCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        minHeight: { xs: 250, md: 270 },
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 10px 28px rgba(7, 17, 47, 0.045)',
        transition:
          'transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
        '@media (hover: hover) and (pointer: fine)': {
          '&:hover': {
            transform: 'translateY(-3px)',
            borderColor: 'primary.light',
            boxShadow: '0 16px 36px rgba(4, 126, 245, 0.12)',
          },
        },
      }}
    >
      <CardActionArea
        onClick={onClick}
        aria-label={`Details zu ${description}`}
        sx={{
          height: '100%',
          '&.Mui-focusVisible': {
            outline: '3px solid',
            outlineColor: 'primary.main',
            outlineOffset: -4,
          },
        }}
      >
        <CardContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 'inherit',
            p: { xs: 3, md: 3.25 },
            '&:last-child': { pb: { xs: 3, md: 3.25 } },
          }}
        >
          <Box
            aria-hidden="true"
            sx={{
              width: 64,
              height: 64,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              borderRadius: '15px',
              color: '#FF7417',
              background:
                'linear-gradient(145deg, #FFF7EC 0%, #FFF0E4 100%)',
            }}
          >
            <FlightTakeoffIcon sx={{ fontSize: 36 }} />
          </Box>

          <Box sx={{ mt: 2.25, minWidth: 0 }}>
            <Typography
              component="h2"
              sx={{
                fontSize: { xs: '1.35rem', sm: '1.5rem' },
                fontWeight: 800,
                letterSpacing: '-0.025em',
                lineHeight: 1.15,
                overflowWrap: 'anywhere',
              }}
            >
              {description}
            </Typography>
            <Typography
              color="text.secondary"
              sx={{ mt: 0.6, fontSize: '1.05rem', lineHeight: 1.3 }}
            >
              {dayjs(date).format('DD.MM.YYYY')}
            </Typography>
          </Box>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1.5}
            sx={{ mt: 'auto', pt: 2.25 }}
          >
            <Chip
              label={`Gesamt: ${formatCurrency(totalAmount)}`}
              sx={{
                maxWidth: 'calc(100% - 54px)',
                height: 42,
                borderRadius: 999,
                bgcolor: '#EAF4FF',
                color: 'text.primary',
                fontSize: { xs: '0.95rem', sm: '1rem' },
                '& .MuiChip-label': {
                  px: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                },
              }}
            />
            <ArrowForwardIcon
              aria-hidden="true"
              sx={{ flexShrink: 0, color: '#0077F5', fontSize: 40 }}
            />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
