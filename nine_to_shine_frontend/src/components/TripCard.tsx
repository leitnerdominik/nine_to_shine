import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
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
    <Card variant="outlined" sx={{ bgcolor: '#fff' }}>
      <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              sx={{ minWidth: 0 }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1,
                  bgcolor: 'rgba(237, 108, 2, 0.1)',
                  color: 'warning.main',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <FlightTakeoffIcon fontSize="small" />
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {description}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {dayjs(date).format('DD.MM.YYYY')}
                </Typography>
              </Box>
            </Stack>

            <Chip
              label={`Gesamt: ${formatCurrency(totalAmount)}`}
              variant="outlined"
              size="small"
            />
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
