'use client';

import { useCallback, useEffect, useState } from 'react';
import { client } from '@/common/contentful';
import Layout from '@/components/Layout';
import { Document } from '@contentful/rich-text-types';
import { Asset, EntryCollection } from 'contentful';
import EntryTile from '@/components/EntryTile';
import dayjs from 'dayjs';
import {
  ChronikSkeleton,
  ContentfulChronikEntry,
  IContentImage,
} from '@/common/types';
import { routes } from '@/common/routes';
import { parseContentfulContentImage } from '@/common/misc';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { Grid2 } from '@mui/material';
import { useSnackbar } from 'notistack';
import CustomTitle from '@/components/CustomTitle';

interface ChronikEntry {
  id: string;
  date: string;
  title: string;
  body: Document | null;
  images: IContentImage[] | null;
}
const Chronik = () => {
  const [content, setContent] = useState<ChronikEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();

  const fetchContent = useCallback(async (): Promise<ChronikEntry[]> => {
    try {
      const response: EntryCollection<ChronikSkeleton> =
        await client.getEntries<ChronikSkeleton>({
          content_type: 'chronik',
        });
      const items = response.items as ContentfulChronikEntry[];
      const result: ChronikEntry[] = items.map((item) => ({
        id: item.sys.id,
        date: dayjs(item.fields.datum).format('DD.MM.YYYY') || '',
        body: item.fields.content || null,
        images: item.fields.images
          ? (item.fields.images as Asset<undefined, string>[])
              .map((img) => parseContentfulContentImage(img))
              .filter((img): img is IContentImage => img !== null)
          : null,
        title: item.fields.title,
      }));
      return result;
    } catch (error) {
      if (error instanceof Error) {
        enqueueSnackbar(error.message, { variant: 'error' });
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    const getContent = async () => {
      const data = await fetchContent();
      setContent(data);
    };
    getContent();
  }, [fetchContent]);

  return (
    <Layout>
      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          <CustomTitle text="Chronik" />
          <Grid2 container spacing={2}>
            {content.map((item) => (
              <EntryTile
                key={item.id}
                id={item.id}
                title={item.title}
                date={item.date}
                baseRoute={routes.chronik}
              />
            ))}
          </Grid2>
        </>
      )}
    </Layout>
  );
};

export default Chronik;
