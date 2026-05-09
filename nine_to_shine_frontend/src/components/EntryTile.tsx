import React from 'react';
import {
  Card,
  CardActionArea,
  CardContent,
  Grid2,
  Typography,
  Box,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import EventNoteIcon from '@mui/icons-material/EventNote';

type EntryTileProps = {
  title: string;
  date: string;
  id: string;
  baseRoute: string;
};

const EntryTile: React.FC<EntryTileProps> = ({
  id,
  title,
  date,
  baseRoute,
}) => {
  const router = useRouter();

  const navigationToChronik = () => {
    router.push(`${baseRoute}/${id}`);
  };

  return (
    <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
      <Card
        sx={{
          width: '100%',
          maxWidth: 340,
          margin: { xs: '0.5rem auto', sm: '0.5rem' },
          borderRadius: 3,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          },
        }}
      >
        <CardActionArea
          onClick={navigationToChronik}
          sx={{
            height: '100%',
            p: 1,
          }}
        >
          <CardContent>
            <Typography
              variant="h6"
              component="div"
              color="primary"
              fontWeight="bold"
              gutterBottom
              sx={{
                lineHeight: 1.3,
                minHeight: '2.6em', // Reserve space for 2 lines to align cards better
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {title}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mt: 1,
                color: 'text.secondary',
              }}
            >
              <EventNoteIcon fontSize="small" color="action" />
              <Typography variant="body2" fontWeight={500}>
                {date}
              </Typography>
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>
    </Grid2>
  );
};

export default EntryTile;
