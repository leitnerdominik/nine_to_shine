'use client';

import { client } from '@/common/contentful';
import { parseContentfulContentImage } from '@/common/misc';
import { IContentImage } from '@/common/types';
import Layout from '@/components/Layout';
import { Asset, Entry, EntryCollection, EntrySkeletonType } from 'contentful';
import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Box,
  Container,
  Dialog,
  IconButton,
  ImageList,
  ImageListItem,
} from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { useSnackbar } from 'notistack';
import Title from '@/components/CustomTitle';

interface ContentfulImageGalleryFields {
  images: Asset<undefined, string>[];
  title: string;
}

type ImageGallerySkeleton = EntrySkeletonType<
  ContentfulImageGalleryFields,
  'imagegallery'
>;

type ContentfulImageGalleryEntry = Entry<
  ImageGallerySkeleton,
  undefined,
  string
>;

interface IImageGalleryEntry {
  title: string;
  images: IContentImage[] | null;
}

const ImageGallery = () => {
  const [images, setImages] = useState<IImageGalleryEntry>();
  const [open, setOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();

  const handleClickOpen = (index: number) => {
    setSelectedImageIndex(index);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedImageIndex(null);
  };

  const handleNext = () => {
    if (selectedImageIndex !== null && images?.images) {
      setSelectedImageIndex((selectedImageIndex + 1) % images.images.length);
    }
  };

  const handlePrev = () => {
    if (selectedImageIndex !== null && images?.images) {
      setSelectedImageIndex(
        (selectedImageIndex - 1 + images.images.length) % images.images.length
      );
    }
  };

  const fetchImages = useCallback(async (): Promise<
    IImageGalleryEntry | undefined
  > => {
    try {
      const response: EntryCollection<ImageGallerySkeleton> =
        await client.getEntries<ImageGallerySkeleton>({
          content_type: 'imagegallery',
          order: ['-sys.createdAt'],
          limit: 1,
        });
      const item = response.items as ContentfulImageGalleryEntry[];
      const result: IImageGalleryEntry = {
        title: item[0].fields.title,
        images: item[0].fields.images
          ? (item[0].fields.images as Asset<undefined, string>[])
              .map((img) => parseContentfulContentImage(img))
              .filter((img): img is IContentImage => img !== null)
          : null,
      };
      return result;
    } catch (error) {
      if (error instanceof Error) {
        enqueueSnackbar(error.message, { variant: 'error' });
      }
      return undefined;
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    const getImages = async () => {
      const data = await fetchImages();
      if (data) setImages(data);
    };
    getImages();
  }, [fetchImages]);

  const currentImage =
    selectedImageIndex !== null && images?.images
      ? images.images[selectedImageIndex]
      : null;

  return (
    <Layout>
      <Container>
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            <Title text="Bilder" />
            {images?.images && (
              <ImageList variant="masonry" cols={2} gap={8}>
                {images.images.map((img, index) => (
                  <ImageListItem
                    key={index}
                    onClick={() => handleClickOpen(index)}
                  >
                    <Image
                      src={'https:' + img.src}
                      width={300}
                      height={200}
                      style={{
                        borderRadius: '8px',
                        objectFit: 'cover',
                        cursor: 'pointer',
                      }}
                      sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw" // Responsive sizing
                      alt={img.alt}
                    />
                  </ImageListItem>
                ))}
              </ImageList>
            )}
          </>
        )}
        <Dialog open={open} onClose={handleClose} maxWidth="lg">
          <Box
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: currentImage ? 'auto' : '100%',
              height: currentImage ? 'auto' : '100%',
            }}
          >
            <IconButton
              onClick={handlePrev}
              style={{
                position: 'absolute',
                left: '0',
                color: '#fff',
                zIndex: 10,
              }}
            >
              <ArrowBackIosIcon />
            </IconButton>
            {currentImage && (
              <Image
                src={'https:' + currentImage.src}
                alt={currentImage.alt}
                layout="responsive"
                width={currentImage.width}
                height={currentImage.height}
                style={{
                  objectFit: 'contain',
                  maxWidth: '100vw',
                  maxHeight: '90vh',
                }}
                priority={true} // Ensures the image loads immediately when dialog opens
              />
            )}
            <IconButton
              onClick={handleNext}
              style={{
                position: 'absolute',
                right: '0',
                color: '#fff',
                zIndex: 10,
              }}
            >
              <ArrowForwardIosIcon />
            </IconButton>
          </Box>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default ImageGallery;
