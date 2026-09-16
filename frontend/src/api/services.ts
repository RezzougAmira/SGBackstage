import { api } from './client';
import { Service } from '../types';

export const servicesApi = {
  list: () => api.get<Service[]>('/api/services'),

  get: (id: number) => api.get<Service>(`/api/services/${id}`),

  create: (data: {
    nom: string;
    methode_http?: string;
    url?: string;
    input_desc?: string;
    output_desc?: string;
    controleur?: string;
    modifie_bdd?: boolean;
  }) => api.post<Service>('/api/services', data),

  update: (id: number, data: {
    nom: string;
    methode_http?: string;
    url?: string;
    input_desc?: string;
    output_desc?: string;
    controleur?: string;
    modifie_bdd?: boolean;
  }) => api.put<Service>(`/api/services/${id}`, data),

  delete: (id: number) => api.delete(`/api/services/${id}`),
};
