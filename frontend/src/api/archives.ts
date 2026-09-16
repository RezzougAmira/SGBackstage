import { api } from './client';
import { Archive, ArchiveDetail } from '../types';

export const archivesApi = {
  list: () => api.get<Archive[]>('/api/archives'),

  get: (id: number) => api.get<ArchiveDetail>(`/api/archives/${id}`),

  create: (identifiant: string) =>
    api.post<Archive>('/api/archives', { identifiant }),
};
