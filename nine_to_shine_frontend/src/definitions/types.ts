export type UserDto = {
  id: number;
  displayName: string;
  email?: string | null;
  isActive: boolean;
  createdAt: string; // ISO
};

export type CreateUserRequest = {
  displayName: string;
  email?: string;
  isActive?: boolean;
};

export type SeasonDto = {
  id: number;
  seasonNumber: number;
};

export type CreateSeasonRequest = {
  seasonNumber: number;
};

export type GameDto = {
  id: number;
  seasonId: number;
  playedAt: string; // ISO
  gameName: string;
  organizedByUserId: number;
  organizedByDisplayName: string;
};

export type CreateGameRequest = {
  seasonId: number;
  playedAt: string; // ISO
  gameName: string;
  organizedByUserId: number;
};

export type RankingDto = {
  id: number;
  gameId: number;
  userId: number;
  points: number;
  seasonId?: number;
  gameName?: string;
  playedAt?: string; // ISO
  isPresent: boolean;
};

export type CreateRankingRequest = {
  gameId: number;
  userId: number;
  points: number;
  isPresent: boolean;
};

export interface OrganizerDutyDto {
  id: number;
  dutyDate: string; // ISO-String
  userId: number;
  userDisplayName: string;
  seasonId: number;
  seasonDisplayNumber: number;
}

export interface CreateOrganizerDutyRequest {
  dutyDate: string; // ISO-String
  userId: number;
  seasonId: number;
}

export interface FinanceDto {
  id: number;
  occurredAt: string;
  direction: 'income' | 'expense';
  amount: number;
  category: string;
  description?: string;
  userId?: number;
  userDisplayName?: string;
  seasonId?: number;
  gameId?: number;
  gameName?: string;
}

export interface CreateFinanceRequest {
  occurredAt?: string;
  direction: 'income' | 'expense';
  amount: number;
  category: string;
  description?: string;
  userId?: number | null; // null für Vereinskasse
  seasonId?: number;
  gameId?: number;
}

export interface TopRankedDto {
  userId: number;
  userDisplayName: string;
  totalPoints: number;
}
