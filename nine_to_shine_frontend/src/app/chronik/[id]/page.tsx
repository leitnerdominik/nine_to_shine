import ChronikContent from '../ChronikContent';
import {
  chronikEntries,
  formatChronikDate,
  getChronikEntry,
} from '../chronik-data';
import CustomTitle from '@/components/CustomTitle';
import Layout from '@/components/Layout';
import { Box, Container, Divider, Typography } from '@mui/material';
import Image from 'next/image';
import { notFound } from 'next/navigation';

interface ChronikEntryPageProps {
  params: Promise<{ id: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return chronikEntries.map((entry) => ({ id: entry.id }));
}

export default async function ChronikEntryPage({
  params,
}: ChronikEntryPageProps) {
  const { id } = await params;
  const entry = getChronikEntry(id);

  if (!entry) {
    notFound();
  }

  return (
    <Layout>
      <Container maxWidth="md" disableGutters>
        <CustomTitle text={entry.title} />
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {formatChronikDate(entry.date)}
        </Typography>
        <Divider sx={{ mb: 4 }} />

        <ChronikContent blocks={entry.blocks} />

        {entry.images.map((image) => (
          <Box
            component="figure"
            key={image.src}
            sx={{ m: 0, mt: 4, overflow: 'hidden', borderRadius: 3 }}
          >
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              sizes="(max-width: 900px) 100vw, 900px"
              style={{ display: 'block', width: '100%', height: 'auto' }}
            />
          </Box>
        ))}
      </Container>
    </Layout>
  );
}
