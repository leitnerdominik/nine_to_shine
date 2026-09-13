import NextLink from 'next/link';
import {
  Box,
  Card,
  CardActionArea,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';

type RankingGameRowProps = {
  gameId: number;
  title: string;
  date: string;
  participantCount: number;
  winnerName: string;
};

const GAME_EMOJI_RULES: ReadonlyArray<{
  keywords: readonly string[];
  emoji: string;
}> = [
  { keywords: ['bowling', 'kegeln'], emoji: '🎳' },
  { keywords: ['pubquiz', 'pub quiz', 'quiz'], emoji: '💡' },
  {
    keywords: [
      'tischtennis',
      'tisch tennis',
      'table tennis',
      'ping pong',
      'pingpong',
    ],
    emoji: '🏓',
  },
  { keywords: ['schach', 'chess'], emoji: '♟️' },
  { keywords: ['darts', 'dart'], emoji: '🎯' },
  {
    keywords: [
      'kicker',
      'tischfußball',
      'tischfussball',
      'table football',
      'foosball',
    ],
    emoji: '⚽',
  },
];

export function getGameEmoji(gameName: string): string {
  const normalizedName = gameName.toLocaleLowerCase('de-DE');
  return (
    GAME_EMOJI_RULES.find(({ keywords }) =>
      keywords.some((keyword) => normalizedName.includes(keyword))
    )?.emoji ?? '🎮'
  );
}

export default function RankingGameRow({
  gameId,
  title,
  date,
  participantCount,
  winnerName,
}: RankingGameRowProps) {
  const emoji = getGameEmoji(title);

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: { xs: 3, sm: 3.5 },
        bgcolor: (theme) => alpha(theme.palette.background.paper, 0.94),
        border: 1,
        borderColor: (theme) => alpha(theme.palette.primary.main, 0.08),
        boxShadow: (theme) =>
          `0 8px 28px ${alpha(theme.palette.primary.dark, 0.07)}`,
        overflow: 'hidden',
        transition: 'transform 160ms ease, box-shadow 160ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: (theme) =>
            `0 12px 32px ${alpha(theme.palette.primary.dark, 0.12)}`,
        },
      }}
    >
      <CardActionArea
        component={NextLink}
        href={`/rankings/${gameId}`}
        aria-label={`Spiel ${title} öffnen`}
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '56px minmax(0, 1fr) 28px',
            sm: '64px minmax(0, 1fr) 36px',
          },
          alignItems: 'center',
          gap: { xs: 1.5, sm: 2 },
          minHeight: { xs: 112, sm: 92 },
          p: { xs: 1.5, sm: 1.75 },
          '&.Mui-focusVisible': {
            outline: '3px solid',
            outlineColor: 'primary.main',
            outlineOffset: -3,
          },
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            display: 'grid',
            placeItems: 'center',
            width: { xs: 56, sm: 64 },
            height: { xs: 56, sm: 64 },
            borderRadius: 2.5,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.07),
            fontSize: { xs: '2rem', sm: '2.25rem' },
            lineHeight: 1,
          }}
        >
          {emoji}
        </Box>

        <Box
          sx={{
            minWidth: 0,
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              md: 'minmax(180px, 1.45fr) repeat(3, minmax(130px, 1fr))',
            },
            alignItems: 'center',
            columnGap: { xs: 1.5, sm: 2.5 },
            rowGap: { xs: 1.25, md: 0 },
          }}
        >
          <Typography
            component="h3"
            sx={{
              gridColumn: { xs: '1 / -1', md: 'auto' },
              minWidth: 0,
              color: 'text.primary',
              fontSize: { xs: '1.05rem', sm: '1.15rem' },
              fontWeight: 800,
              lineHeight: 1.25,
              overflowWrap: 'anywhere',
            }}
          >
            {title}
          </Typography>

          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ minWidth: 0, color: 'text.secondary' }}
          >
            <CalendarMonthOutlinedIcon aria-hidden="true" fontSize="small" />
            <Typography variant="body2" fontWeight={600} noWrap>
              {date}
            </Typography>
          </Stack>

          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ minWidth: 0, color: 'text.secondary' }}
          >
            <GroupsOutlinedIcon aria-hidden="true" fontSize="small" />
            <Typography variant="body2" fontWeight={600} noWrap>
              {participantCount}
            </Typography>
          </Stack>

          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              gridColumn: { xs: '1 / -1', md: 'auto' },
              minWidth: 0,
              color: 'text.secondary',
            }}
          >
            <EmojiEventsIcon
              aria-hidden="true"
              fontSize="small"
              sx={{ color: 'warning.main', flexShrink: 0 }}
            />
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
              noWrap
            >
              {winnerName}
            </Typography>
          </Stack>
        </Box>

        <ArrowForwardIcon
          aria-hidden="true"
          sx={{ color: 'primary.main', fontSize: { xs: 26, sm: 32 } }}
        />
      </CardActionArea>
    </Card>
  );
}
