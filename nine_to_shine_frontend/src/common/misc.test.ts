import { describe, expect, it } from 'vitest';
import {
  capitalizeFirstLetter,
  formatCurrency,
  getRankStyle,
  parseContentfulContentImage,
  stringAvatar,
  stringToColor,
} from './misc';

describe('common misc helpers', () => {
  it('formats Euro currency for German locale', () => {
    expect(formatCurrency(1250.5)).toBe('1.250,50\u00a0€');
  });

  it('capitalizes only the first letter', () => {
    expect(capitalizeFirstLetter('shine')).toBe('Shine');
    expect(capitalizeFirstLetter('')).toBe('');
  });

  it('creates deterministic avatar initials and colors', () => {
    expect(stringToColor('Nine To Shine')).toMatch(/^#[0-9a-f]{6}$/);
    expect(stringToColor('Nine To Shine')).toBe(stringToColor('Nine To Shine'));
    expect(stringAvatar('Nine Shine')).toMatchObject({
      children: 'NS',
      sx: {
        width: 64,
        height: 64,
      },
    });
  });

  it('extracts usable image data from resolved Contentful assets', () => {
    const image = parseContentfulContentImage({
      fields: {
        description: 'Group photo',
        file: {
          url: '//images.ctfassets.net/photo.jpg',
          details: {
            image: {
              width: 1200,
              height: 800,
            },
          },
        },
      },
    } as Parameters<typeof parseContentfulContentImage>[0]);

    expect(image).toEqual({
      src: '//images.ctfassets.net/photo.jpg',
      alt: 'Group photo',
      width: 1200,
      height: 800,
    });
  });

  it('ignores unresolved Contentful asset links', () => {
    expect(parseContentfulContentImage({ sys: { type: 'Link' } } as never)).toBeNull();
    expect(parseContentfulContentImage()).toBeNull();
  });

  it('returns medal styles for podium places only', () => {
    expect(getRankStyle(0).iconColor).toBe('#FFD700');
    expect(getRankStyle(1).iconColor).toBe('#C0C0C0');
    expect(getRankStyle(2).iconColor).toBe('#CD7F32');
    expect(getRankStyle(3)).toEqual({
      iconColor: 'transparent',
      bgColor: 'transparent',
    });
  });
});
