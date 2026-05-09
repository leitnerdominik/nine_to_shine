'use client';

import { client } from '@/common/contentful';
import { options } from '@/common/richtextoptions';
import Layout from '@/components/Layout';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import CustomTitle from '@/components/CustomTitle';
import { documentToReactComponents } from '@contentful/rich-text-react-renderer';
import { Document } from '@contentful/rich-text-types';
import { Box } from '@mui/material';
import {
  Entry,
  EntryCollection,
  EntryFieldTypes,
  EntrySkeletonType,
} from 'contentful';
import { useCallback, useEffect, useState } from 'react';

interface ContentfulConstitutionFields {
  content: EntryFieldTypes.RichText;
}

interface ConstitutionEntry {
  content: Document;
}

type ConstitutionSkeleton = EntrySkeletonType<
  ContentfulConstitutionFields,
  'home'
>;

type ContentfulConstitutionEntry = Entry<
  ConstitutionSkeleton,
  undefined,
  string
>;

export default function ConstitutionPage() {
  const [constitution, setConstitution] = useState<
    ConstitutionEntry | undefined
  >();
  const [loading, setLoading] = useState(true);

  const fetchContent = useCallback(async (): Promise<
    ConstitutionEntry | undefined
  > => {
    try {
      setLoading(true);
      // Ruft den Inhalt vom Typ 'home' ab, der die Verfassung enthält
      const response: EntryCollection<ConstitutionSkeleton> =
        await client.getEntries<ConstitutionSkeleton>({
          content_type: 'home',
          order: ['-sys.createdAt'],
          limit: 1,
        });

      if (response.items.length > 0) {
        const item = response.items[0] as ContentfulConstitutionEntry;
        const result: ConstitutionEntry = {
          content: item.fields.content,
        };
        return result;
      }
      return undefined;
    } catch (error) {
      console.error(error);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const getContent = async () => {
      const data = await fetchContent();
      setConstitution(data);
    };
    getContent();
  }, [fetchContent]);

  return (
    <Layout>
      {loading ? (
        <LoadingSkeleton />
      ) : (
        constitution?.content && (
          <Box>
            <CustomTitle text="Verfassung" />
            <Box sx={{ marginTop: '2rem' }}>
              {documentToReactComponents(constitution.content, options)}
            </Box>
          </Box>
        )
      )}
    </Layout>
  );
}
