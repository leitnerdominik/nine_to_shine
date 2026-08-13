import { Entry, EntrySkeletonType } from 'contentful';

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
