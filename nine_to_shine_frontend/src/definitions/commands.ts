import { api, toErrorMessage } from './api';
import {
  CreateGameRequest,
  CreateRankingRequest,
  CreateSeasonRequest,
  CreateUserRequest,
  GameDto,
  RankingDto,
  SeasonDto,
  UserDto,
  OrganizerDutyDto,
  CreateOrganizerDutyRequest,
  CreateFinanceRequest,
  FinanceDto,
  TopRankedDto,
} from './types';

/**
 * ---- API surface ----
 * Each method throws with a readable error message (string).
 */
export const apiUsers = {
  async getAll(): Promise<UserDto[]> {
    try {
      const { data } = await api.get<UserDto[]>('/user');
      return data;
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async getById(id: number): Promise<UserDto> {
    try {
      const { data } = await api.get<UserDto>(`/user/${id}`);
      return data;
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async create(body: CreateUserRequest): Promise<UserDto> {
    try {
      const { data } = await api.post<UserDto>('/User', body);
      return data;
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async remove(id: number): Promise<void> {
    try {
      await api.delete(`/user/${id}`);
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },
};

export const apiSeason = {
  async getAll(): Promise<SeasonDto[]> {
    try {
      const { data } = await api.get<SeasonDto[]>('/season');
      return data;
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async getById(id: number): Promise<SeasonDto> {
    try {
      const { data } = await api.get<SeasonDto>(`/season/${id}`);
      return data;
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async create(body: CreateSeasonRequest): Promise<SeasonDto> {
    try {
      const { data } = await api.post<SeasonDto>('/season', body);
      return data;
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async remove(id: number): Promise<void> {
    try {
      await api.delete(`/season/${id}`);
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },
};

export const apiGame = {
  async getAll(params?: {
    seasonId?: number;
    gameName?: string;
  }): Promise<GameDto[]> {
    try {
      const { data } = await api.get<GameDto[]>('/game', { params });
      return data;
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async getById(id: number): Promise<GameDto> {
    try {
      const { data } = await api.get<GameDto>(`/game/${id}`);
      return data;
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async create(body: CreateGameRequest): Promise<GameDto> {
    try {
      const { data } = await api.post<GameDto>('/game', body);
      return data;
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async remove(id: number): Promise<void> {
    try {
      await api.delete(`/game/${id}`);
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },
  async update(
    id: number,
    payload: {
      seasonId: number;
      playedAt: string;
      gameName: string;
      organizedByUserId: number;
    }
  ) {
    const res = await api.put(`/game/${id}`, payload);
    return res.data as GameDto;
  },

  async getGamesWithBookings(): Promise<GameDto[]> {
    const { data } = await api.get<GameDto[]>('/game/with-bookings');
    return data;
  },
};

export const apiRanking = {
  async getAll(params?: {
    seasonId?: number;
    gameId?: number;
    gameName?: string;
  }): Promise<RankingDto[]> {
    try {
      const { data } = await api.get<RankingDto[]>('/ranking', { params });
      return data;
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async getById(id: number): Promise<RankingDto> {
    try {
      const { data } = await api.get<RankingDto>(`/ranking/${id}`);
      return data;
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async create(body: CreateRankingRequest): Promise<RankingDto> {
    try {
      const { data } = await api.post<RankingDto>('/ranking', body);
      return data;
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async remove(id: number): Promise<void> {
    try {
      await api.delete(`/ranking/${id}`);
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  deleteByGame: async (gameId: number): Promise<void> => {
    await api.delete(`/ranking/by-game/${gameId}`);
  },

  getTopRanked: async (seasonId?: number) => {
    const query = seasonId ? `?seasonId=${seasonId}` : '';
    const { data } = await api.get<TopRankedDto | null>(`/Ranking/top${query}`);
    return data;
  },
};

export const apiOrganizerDuty = {
  async getAll(): Promise<OrganizerDutyDto[]> {
    const res = await api.get<OrganizerDutyDto[]>('/OrganizerDuty');
    return res.data;
  },

  async create(payload: CreateOrganizerDutyRequest): Promise<OrganizerDutyDto> {
    const res = await api.post<OrganizerDutyDto>('/OrganizerDuty', payload);
    return res.data;
  },

  async update(
    id: number,
    payload: CreateOrganizerDutyRequest
  ): Promise<OrganizerDutyDto> {
    const res = await api.put<OrganizerDutyDto>(
      `/OrganizerDuty/${id}`,
      payload
    );
    return res.data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/OrganizerDuty/${id}`);
  },

  getNextDuty: async () => {
    const { data } = await api.get<OrganizerDutyDto | null>(
      '/OrganizerDuty/next'
    );
    return data;
  },
};

export const apiFinance = {
  async getAll(params?: {
    userId?: number;
    seasonId?: number;
    gameId?: number;
    scope?: 'global';
    direction?: 'income' | 'expense';
  }): Promise<FinanceDto[]> {
    try {
      const { data } = await api.get<FinanceDto[]>('/finance', { params });
      return data;
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async getById(id: number): Promise<FinanceDto> {
    try {
      const { data } = await api.get<FinanceDto>(`/finance/${id}`);
      return data;
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async create(body: CreateFinanceRequest): Promise<FinanceDto> {
    try {
      const { data } = await api.post<FinanceDto>('/finance', body);
      return data;
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async remove(id: number): Promise<void> {
    try {
      await api.delete(`/finance/${id}`);
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async getGlobalBalance(): Promise<number> {
    try {
      const { data } = await api.get<number>('/finance/balance/global');
      return data;
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async getUserBalance(userId: number): Promise<number> {
    try {
      const { data } = await api.get<number>(`/finance/balance/user/${userId}`);
      return data;
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async getClubBalance(): Promise<number> {
    const { data } = await api.get<number>('/finance/balance/club');
    return data;
  },

  async deleteByGameId(gameId: number): Promise<void> {
    try {
      await api.delete(`/finance/by-game/${gameId}`);
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async deleteTripsByDate(date: Date): Promise<void> {
    try {
      await api.delete(`/finance/trip/by-date?date=${date.toISOString()}`);
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },
};
