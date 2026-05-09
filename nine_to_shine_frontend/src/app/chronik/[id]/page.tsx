'use client';

import { client } from '@/common/contentful';
import Layout from '@/components/Layout';
import { documentToReactComponents } from '@contentful/rich-text-react-renderer';
import { Asset, AssetLink, Entry } from 'contentful';
import dayjs from 'dayjs';
import { useParams } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ChronikSkeleton,
  ContentfulChronikEntry,
  IChronikEntry,
  IContentImage,
} from '@/common/types';
import { Box, Container, Divider, Typography } from '@mui/material';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { useSnackbar } from 'notistack';
import { options } from '@/common/richtextoptions';
import CustomTitle from '@/components/CustomTitle';

function parseContentfulContentImage(
  asset?: Asset<undefined, string> | { sys: AssetLink }
): IContentImage | null {
  if (!asset) {
    return null;
  }

  if (!('fields' in asset)) {
    return null;
  }

  return {
    src: asset.fields.file?.url || '',
    alt: asset.fields.description || '',
    width: asset.fields.file?.details.image?.width || 0,
    height: asset.fields.file?.details.image?.height || 0,
  };
}

const ChronikEntry: React.FC = () => {
  const params = useParams(); // Use `useParams` to get the route parameters
  const id = params?.id as string;

  const [content, setContent] = useState<IChronikEntry | undefined>();
  const [loading, setLoading] = useState(true);

  const { enqueueSnackbar } = useSnackbar();

  const fetchContent = useCallback(async (): Promise<IChronikEntry | null> => {
    try {
      const response: Entry<ChronikSkeleton> = await client.getEntry(id);
      const item = response as ContentfulChronikEntry;
      const result: IChronikEntry = {
        id: item.sys.id,
        date: dayjs(item.fields.datum).format('DD.MM.YYYY') || '',
        body: item.fields.content || null,
        images: item.fields.images
          ? (item.fields.images as Asset<undefined, string>[])
              .map((img) => parseContentfulContentImage(img))
              .filter((img): img is IContentImage => img !== null)
          : null,
        title: item.fields.title,
      };
      return result;
    } catch (error) {
      if (error instanceof Error) {
        enqueueSnackbar(error.message, { variant: 'error' });
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar, id]);

  useEffect(() => {
    const getContent = async () => {
      const data = await fetchContent();
      if (data) setContent(data);
    };
    getContent();
  }, [fetchContent]);

  return (
    <Layout>
      {loading ? (
        <LoadingSkeleton />
      ) : (
        content && (
          <Container>
            <CustomTitle text={content.title} />
            <Typography variant="body2" gutterBottom>
              {content.date}
            </Typography>
            <Divider />
            {content.body && (
              <Box sx={{ marginTop: '3rem' }}>
                {documentToReactComponents(content.body, options)}
              </Box>
            )}
          </Container>
        )
      )}
    </Layout>
  );
};

export default ChronikEntry;
