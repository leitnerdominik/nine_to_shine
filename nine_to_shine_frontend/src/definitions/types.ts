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

export type SaveRankedGameRequest = CreateGameRequest & {
  gameId?: number;
  rankings: Array<{
    userId: number;
    points: number;
    isPresent: boolean;
  }>;
};

export interface OrganizerDutyDto {
  id: number;
  dutyDate: string; // ISO-String
  userId?: number | null;
  userDisplayName?: string | null;
  seasonId: number;
  seasonDisplayNumber: number;
  isSkipped: boolean;
  isManualOverride: boolean;
}

export interface CreateOrganizerDutyRequest {
  dutyDate: string; // ISO-String
  userId?: number | null;
  seasonId: number;
  isSkipped?: boolean;
  isManualOverride?: boolean;
}

export interface OrganizerRotationMemberDto {
  id: number;
  seasonId: number;
  userId: number;
  userDisplayName: string;
  sortOrder: number;
}

export interface UpdateOrganizerRotationRequest {
  userIds: number[];
}

export interface GenerateOrganizerDutiesRequest {
  seasonId: number;
  startMonth: string;
  monthCount: number;
}

export interface GenerateOrganizerDutiesResponse {
  createdCount: number;
  existingCount: number;
  duties: OrganizerDutyDto[];
}

export interface FinanceDto {
  id: number;
  updatedAt: string;
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
  tripId?: number | null;
}

export interface UnpaidDuesMemberDto {
  userId: number;
  displayName: string;
}

export interface GameDuesStatusDto {
  gameId: number;
  seasonId: number;
  playedAt: string;
  gameName: string;
  activeMemberCount: number;
  paidMemberCount: number;
  unpaidMembers: UnpaidDuesMemberDto[];
}

export interface UserBalanceDto {
  userId: number;
  displayName: string;
  balance: number;
}

export interface BalanceOverviewDto {
  globalBalance: number;
  clubBalance: number;
  membersBalance: number;
  userBalances: UserBalanceDto[];
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

export interface UpdateFinanceRequest extends CreateFinanceRequest {
  updatedAt: string;
}

export interface FinanceVersionReference {
  id: number;
  updatedAt: string;
}

export interface FinanceVersionReferencesRequest {
  transactions: FinanceVersionReference[];
}

export interface GameDepositMemberRequest {
  userId: number;
  memberAmount: number;
  clubAmount: number;
  description?: string;
}

export interface GameDepositOtherIncomeRequest {
  amount: number;
  description?: string;
}

export interface ReplaceGameDepositsRequest {
  transactions: FinanceVersionReference[];
  occurredAt: string;
  members: GameDepositMemberRequest[];
  otherIncomes: GameDepositOtherIncomeRequest[];
}

export interface CreateDepositBatchRequest {
  occurredAt: string;
  seasonId: number;
  gameId?: number;
  members: GameDepositMemberRequest[];
  otherIncomes: GameDepositOtherIncomeRequest[];
}

export interface CreateExpenseBatchRequest {
  occurredAt: string;
  seasonId: number;
  gameId?: number;
  items: {
    amount: number;
    description?: string;
  }[];
}

export interface TripSplitRequest {
  direction: 'income' | 'expense';
  amount: number;
  description?: string;
  userIds: number[];
}

export interface CreateTripRequest extends TripSplitRequest {
  occurredAt: string;
  name: string;
  seasonId: number;
}

export interface ReplaceTripSplitRequest extends TripSplitRequest {
  transactions: FinanceVersionReference[];
}

export interface ReplaceTripSplitsBatchRequest {
  userIds: number[];
  splits: {
    transactions: FinanceVersionReference[];
    direction: 'income' | 'expense';
    amount: number;
    description?: string;
  }[];
}

export interface TripSummaryDto {
  id: number;
  name: string;
  occurredAt: string;
  seasonId: number | null;
  totalAmount: number;
}

export interface TripDetailsDto {
  id: number;
  name: string;
  occurredAt: string;
  seasonId: number | null;
  transactions: FinanceDto[];
}

export interface TopRankedDto {
  userId: number;
  userDisplayName: string;
  totalPoints: number;
}
