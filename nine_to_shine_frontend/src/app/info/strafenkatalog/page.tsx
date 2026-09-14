import PunishmentTable from './PunishmentTable';
import Layout from '@/components/Layout';
import PageTitle from '@/components/PageTitle';
import { Box } from '@mui/material';

export default function PunishmentPage() {
  return (
    <Layout>
      <Box>
        <Box component="header" sx={{ mb: { xs: 3, md: 4 } }}>
          <PageTitle title="Strafen" />
        </Box>
        <PunishmentTable />
      </Box>
    </Layout>
  );
}
