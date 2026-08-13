import type { ChronikBlock } from './chronik-data';
import {
  Box,
  List,
  ListItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

interface ChronikContentProps {
  blocks: ChronikBlock[];
}

export default function ChronikContent({ blocks }: ChronikContentProps) {
  return (
    <Stack spacing={2.25}>
      {blocks.map((block, blockIndex) => {
        switch (block.type) {
          case 'paragraph':
            return (
              <Typography
                key={`${block.type}-${blockIndex}`}
                lineHeight={1.75}
                sx={{ whiteSpace: 'pre-line' }}
              >
                {block.text}
              </Typography>
            );
          case 'heading':
            return (
              <Typography
                key={`${block.type}-${blockIndex}`}
                component={block.level === 3 ? 'h2' : 'h3'}
                variant={block.level === 3 ? 'h5' : 'h6'}
                color="primary.main"
                fontWeight={700}
                sx={{ pt: block.level === 3 ? 2 : 1 }}
              >
                {block.text}
              </Typography>
            );
          case 'list':
            return (
              <List
                component="ul"
                disablePadding
                key={`${block.type}-${blockIndex}`}
                sx={{ pl: 1 }}
              >
                {block.items.map((item) => (
                  <ListItem
                    component="li"
                    disableGutters
                    key={item}
                    sx={{ alignItems: 'flex-start', py: 0.35 }}
                  >
                    <Box
                      aria-hidden="true"
                      sx={{
                        width: 6,
                        height: 6,
                        mt: 1.1,
                        mr: 1.5,
                        flexShrink: 0,
                        borderRadius: '50%',
                        bgcolor: 'secondary.main',
                      }}
                    />
                    <Typography lineHeight={1.65}>{item}</Typography>
                  </ListItem>
                ))}
              </List>
            );
          case 'table':
            return (
              <TableContainer
                component={Paper}
                key={`${block.type}-${blockIndex}`}
                variant="outlined"
                sx={{ borderRadius: 2 }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {block.headers.map((header) => (
                        <TableCell
                          key={header}
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            fontWeight: 700,
                          }}
                        >
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {block.rows.map((row, rowIndex) => (
                      <TableRow key={`${blockIndex}-${rowIndex}`}>
                        {row.map((cell, cellIndex) => (
                          <TableCell key={`${rowIndex}-${cellIndex}`}>
                            {cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            );
        }
      })}
    </Stack>
  );
}
