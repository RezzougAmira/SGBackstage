import { api } from './client';
import { Procedure, Service } from '../types';

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
    collection?: Record<string, unknown> | null;
  }) => api.post<Service>('/api/services', data),

  update: (id: number, data: {
    nom: string;
    methode_http?: string;
    url?: string;
    input_desc?: string;
    output_desc?: string;
    controleur?: string;
    modifie_bdd?: boolean;
    collection?: Record<string, unknown> | null;
  }) => api.put<Service>(`/api/services/${id}`, data),

  delete: (id: number) => api.delete(`/api/services/${id}`),

  assignToMasque: (serviceId: number, masqueId: number) =>
    api.post<Service>(`/api/services/${serviceId}/assign-masque/${masqueId}`),

  procedures: (serviceId: number) =>
    api.get<Procedure[]>(`/api/services/${serviceId}/procedures`),

  createProcedure: (serviceId: number, data: { nom: string; description?: string }) =>
    api.post<Procedure>(`/api/services/${serviceId}/procedures`, data),

  attachProcedure: (serviceId: number, procedureId: number) =>
    api.post<Procedure>(`/api/services/${serviceId}/procedures/${procedureId}`),

  detachProcedure: (serviceId: number, procedureId: number) =>
    api.delete(`/api/services/${serviceId}/procedures/${procedureId}`),
};
