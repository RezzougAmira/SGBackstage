import { api } from './client';
import { SearchResults, Stats } from '../types';

export const searchApi = {
  search: (query: string) =>
    api.get<SearchResults>(`/api/search?q=${encodeURIComponent(query)}`),

  getStats: () => api.get<Stats>('/api/stats'),
};
