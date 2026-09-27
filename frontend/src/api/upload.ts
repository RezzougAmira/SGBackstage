import { api } from './client';

export interface UploadResult {
  key: string;
  type: string;
  filename: string;
}

export const uploadApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.upload<UploadResult>('/api/upload/', form);
  },

  remove: (key: string) => api.delete<{ message: string }>(`/api/upload/?key=${encodeURIComponent(key)}`),
};
