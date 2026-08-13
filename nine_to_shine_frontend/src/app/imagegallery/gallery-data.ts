export interface GalleryImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface GalleryEntry {
  title: string;
  images: GalleryImage[];
}

export const imageGallery: GalleryEntry = {
  title: 'Treffen 08.11.2024',
  images: [
    {
      src: '/imagegallery/treffen-2024-11-08.jpeg',
      alt: 'Gruppenfoto vom Treffen am 8. November 2024',
      width: 1848,
      height: 4000,
    },
  ],
};
