import { api } from './client';
import { Etape, EtapeDetail, EtapeImpact, EtapeSuppressionResult } from '../types';

export const etapesApi = {
  get: (processId: number, id: number) =>
    api.get<EtapeDetail>(`/api/processes/${processId}/etapes/${id}`),

  getById: (id: number) => api.get<EtapeDetail>(`/api/etapes/${id}`),

  create: (processId: number, data: { nom: string; description?: string; ordre: number }) =>
    api.post<Etape>(`/api/processes/${processId}/etapes`, { ...data, process_id: processId }),

  update: (processId: number, id: number, data: { nom: string; description?: string; ordre: number }) =>
    api.put<Etape>(`/api/processes/${processId}/etapes/${id}`, { ...data, process_id: processId }),

  // Par défaut l'étape disparaît mais ses masques sont conservés : l'utilisateur
  // choisit explicitement de les effacer avec la base.
  delete: (processId: number, id: number, supprimerMasques = false) =>
    api.delete<EtapeSuppressionResult>(
      `/api/processes/${processId}/etapes/${id}?supprimer_masques=${supprimerMasques}`
    ),

  // Où l'étape est utilisée, pour dimensionner la suppression avant de la confirmer.
  impact: (id: number) => api.get<EtapeImpact>(`/api/etapes/${id}/impact`),

  // Document Word de l'étape (masques, fonctionnalités, services), généré
  // côté serveur. Récupéré en binaire car la route n'est pas du JSON.
  exportDocx: (id: number) => api.getBlob(`/api/etapes/${id}/export`),

  // Retire un masque de cette étape sans supprimer le masque lui-même.
  detachMasque: (etapeId: number, masqueId: number) =>
    api.delete<{ message: string }>(`/api/etapes/${etapeId}/masques/${masqueId}`),

  reorder: (processId: number, etapeIds: number[]) =>
    api.put(`/api/processes/${processId}/etapes/reorder`, { etape_ids: etapeIds }),
};
