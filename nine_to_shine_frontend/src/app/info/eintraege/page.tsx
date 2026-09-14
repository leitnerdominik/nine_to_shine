import { routes } from '@/common/routes';
import EntryTile from '@/components/EntryTile';
import Layout from '@/components/Layout';
import PageTitle from '@/components/PageTitle';
import { Box, Grid2 } from '@mui/material';
import { chronikEntries, formatChronikDate } from '../chronik-data';

export default function ChronikEntriesPage() {
  const entries = [...chronikEntries].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  return (
    <Layout>
      <Box component="header" sx={{ mb: { xs: 3, md: 4 } }}>
        <PageTitle title="Chronik" />
      </Box>
      <Grid2 container spacing={2}>
        {entries.map((entry) => (
          <EntryTile
            key={entry.id}
            id={entry.id}
            title={entry.title}
            date={formatChronikDate(entry.date)}
            baseRoute={routes.chronikEntries}
          />
        ))}
      </Grid2>
    </Layout>
  );
}
