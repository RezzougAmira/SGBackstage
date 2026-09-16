import { api } from './client';
import { User, Token } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<Token>('/api/auth/login', { email, password }),

  register: (data: { email: string; password: string; name: string }) =>
    api.post<User>('/api/auth/register', data),
};
