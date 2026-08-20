import PunishmentTable from './PunishmentTable';
import CustomTitle from '@/components/CustomTitle';
import Layout from '@/components/Layout';
import { Box } from '@mui/material';

export default function PunishmentPage() {
  return (
    <Layout>
      <Box>
        <CustomTitle text="Strafen" />
        <PunishmentTable />
      </Box>
    </Layout>
  );
}
