import { api } from './client';
import { Archive, ArchiveDetail, PaginatedResponse } from '../types';

export const archivesApi = {
  list: (page = 1, page_size = 50) =>
    api.get<PaginatedResponse<Archive>>(`/api/archives?page=${page}&page_size=${page_size}`),

  get: (id: number) => api.get<ArchiveDetail>(`/api/archives/${id}`),

  create: (identifiant: string) =>
    api.post<Archive>('/api/archives', { identifiant }),
};
