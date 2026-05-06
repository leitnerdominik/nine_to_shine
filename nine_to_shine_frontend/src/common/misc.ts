import { Asset, AssetLink } from 'contentful';
import { IContentImage } from './types';

export const parseContentfulContentImage = (
  asset?: Asset<undefined, string> | { sys: AssetLink }
): IContentImage | null => {
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
};

export const capitalizeFirstLetter = (val: string) => {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
};

export const cdwrd = 'Moesensaefter';

// Formatiert Zahlen als Währung (z.B. "1.250,50 €")
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

// Generiert eine deterministische Farbe aus einem String (Name)
export function stringToColor(string: string) {
  let hash = 0;
  for (let i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
}

// Erstellt Props für den MUI Avatar (Initialen + Hintergrundfarbe)
export function stringAvatar(name: string) {
  const parts = name.split(' ');
  const initials =
    parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`
      : `${parts[0][0]}${parts[0][1] ?? ''}`;

  return {
    sx: {
      bgcolor: stringToColor(name),
      width: 64,
      height: 64,
      fontSize: '1.5rem',
      border: '4px solid white',
    },
    children: initials.toUpperCase(),
  };
}

export const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return {
          iconColor: '#FFD700', // Gold
          bgColor: 'rgba(255, 215, 0, 0.1)',
        };
      case 1:
        return {
          iconColor: '#C0C0C0', // Silver
          bgColor: 'rgba(192, 192, 192, 0.1)',
        };
      case 2:
        return {
          iconColor: '#CD7F32', // Bronze
          bgColor: 'rgba(205, 127, 50, 0.1)',
        };
      default:
        return {
          iconColor: 'transparent',
          bgColor: 'transparent',
        };
    }
  };