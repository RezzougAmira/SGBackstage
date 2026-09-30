import { api } from './client';
import { User, Token } from '../types';

/**
 * Mise à jour de son propre profil. L'API n'accepte que le nom et la photo :
 * l'email et le rôle restent gérés par l'administration.
 */
export const updateProfile = (data: { name?: string; avatar_key?: string | null }) =>
  api.patch<User>('/api/auth/me', data);

export const authApi = {
  updateMe: updateProfile,

  /** Mise à jour d'un compte par un administrateur (nom, email, rôle, statut). */
  updateUser: (
    id: number,
    data: { name?: string; email?: string; role?: string; blocked?: number; avatar_key?: string | null },
  ) =>
    api.patch<User>(`/api/auth/users/${id}`, data),

  login: (email: string, password: string) =>
    api.post<Token>('/api/auth/login', { email, password }),

  register: (data: { email: string; password: string; name: string }) =>
    api.post<User>('/api/auth/register', data),

  me: () => api.get<User>('/api/auth/me'),

  listUsers: () => api.get<User[]>('/api/auth/users'),

  createUser: (data: { email: string; password: string; name: string; role?: string }) =>
    api.post<User>('/api/auth/users', data),

  blockUser: (id: number) => api.post<User>(`/api/auth/users/${id}/block`),

  unblockUser: (id: number) => api.post<User>(`/api/auth/users/${id}/unblock`),
};
