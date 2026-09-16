import { api } from './client';
import { DC, DCDetail } from '../types';

export interface DCCreateData {
  numero: string;
  titre: string;
  description?: string;
  auteur_id?: number;
  etape_id?: number;
  archive_id?: number;
  masques?: { masque_id: number; action: string; details?: string }[];
  services?: { service_id: number; action: string; details?: string }[];
  procedures?: { procedure_id: number; action: string; details?: string }[];
  tables?: { table_id: number; action: string; details?: string }[];
  attributs?: { attribut_id: number; action: string; details?: string }[];
}

export const dcApi = {
  list: () => api.get<DC[]>('/api/dcs'),

  get: (id: number) => api.get<DCDetail>(`/api/dcs/${id}`),

  create: (data: DCCreateData) => api.post<DC>('/api/dcs', data),

  update: (id: number, data: DCCreateData) =>
    api.put<DC>(`/api/dcs/${id}`, data),

  delete: (id: number) => api.delete(`/api/dcs/${id}`),
};
