'use client';

import { imageGallery } from './gallery-data';
import CustomTitle from '@/components/CustomTitle';
import Layout from '@/components/Layout';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import {
  Box,
  Container,
  Dialog,
  IconButton,
  ImageList,
  ImageListItem,
} from '@mui/material';
import Image from 'next/image';
import { useState } from 'react';

export default function ImageGalleryPage() {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );

  const currentImage =
    selectedImageIndex === null
      ? null
      : imageGallery.images[selectedImageIndex];

  const handleClose = () => {
    setSelectedImageIndex(null);
  };

  const handleNext = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex(
        (selectedImageIndex + 1) % imageGallery.images.length
      );
    }
  };

  const handlePrev = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex(
        (selectedImageIndex - 1 + imageGallery.images.length) %
          imageGallery.images.length
      );
    }
  };

  return (
    <Layout>
      <Container>
        <CustomTitle text="Bilder" />
        <ImageList
          variant="masonry"
          cols={2}
          gap={8}
          aria-label={imageGallery.title}
        >
          {imageGallery.images.map((image, index) => (
            <ImageListItem
              key={image.src}
              onClick={() => setSelectedImageIndex(index)}
              sx={{ cursor: 'pointer' }}
            >
              <Image
                src={image.src}
                width={image.width}
                height={image.height}
                sizes="(max-width: 600px) 100vw, 50vw"
                alt={image.alt}
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  borderRadius: 8,
                }}
              />
            </ImageListItem>
          ))}
        </ImageList>

        <Dialog open={currentImage !== null} onClose={handleClose} maxWidth="lg">
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'common.black',
            }}
          >
            {imageGallery.images.length > 1 && (
              <IconButton
                aria-label="Vorheriges Bild"
                onClick={handlePrev}
                sx={{
                  position: 'absolute',
                  left: 8,
                  color: 'common.white',
                  zIndex: 1,
                }}
              >
                <ArrowBackIosIcon />
              </IconButton>
            )}

            {currentImage && (
              <Image
                src={currentImage.src}
                alt={currentImage.alt}
                width={currentImage.width}
                height={currentImage.height}
                sizes="100vw"
                priority
                style={{
                  display: 'block',
                  width: 'auto',
                  height: 'auto',
                  maxWidth: '90vw',
                  maxHeight: '90vh',
                  objectFit: 'contain',
                }}
              />
            )}

            {imageGallery.images.length > 1 && (
              <IconButton
                aria-label="Nächstes Bild"
                onClick={handleNext}
                sx={{
                  position: 'absolute',
                  right: 8,
                  color: 'common.white',
                  zIndex: 1,
                }}
              >
                <ArrowForwardIosIcon />
              </IconButton>
            )}
          </Box>
        </Dialog>
      </Container>
    </Layout>
  );
}
