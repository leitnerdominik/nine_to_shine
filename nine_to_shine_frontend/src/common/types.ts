import { Document } from '@contentful/rich-text-types';
import { Asset, Entry, EntryFieldTypes, EntrySkeletonType } from 'contentful';

export interface IChronikEntry {
  id: string;
  date: string;
  title: string;
  body: Document | null;
  images: IContentImage[] | null;
}

export interface ContentfulChronikFields {
  datum: Date;
  content: EntryFieldTypes.RichText;
  images: Asset<undefined, string>[];
  title: string;
}

export type ChronikSkeleton = EntrySkeletonType<
  ContentfulChronikFields,
  'chronik'
>;

export type ContentfulChronikEntry = Entry<ChronikSkeleton, undefined, string>;

export interface IContentImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface IRankingEntry {
  id: string;
  title: string;
  datum: string;
  flori: number;
  simi: number;
  geti: number;
  stocki: number;
  tom: number;
  martin: number;
  bubi: number;
  dave: number;
  dommo: number;
  season: number;
}

export type RankingSkeleton = EntrySkeletonType<IRankingEntry, 'ranking'>;

export type ContentfulRankingEntry = Entry<RankingSkeleton, undefined, string>;

export interface NavigationItem {
  text: string;
  path: string;
  icon: React.ReactNode;
}
