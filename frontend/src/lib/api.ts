import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export interface User {
  id: string;
  username: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Document {
  id: string;
  filename: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
  storage_backend: string;
  is_public: boolean;
  download_count: number;
  created_at: string;
  owner_id: string;
}

export interface DocumentList {
  items: Document[];
  total: number;
}

export interface Stats {
  users: number;
  documents: number;
  total_size_bytes: number;
  total_downloads: number;
}

export const authApi = {
  register: (username: string, password: string) =>
    api.post<User>('/auth/register', { username, password }),
  login: (username: string, password: string) => {
    const form = new URLSearchParams();
    form.append('username', username);
    form.append('password', password);
    return api.post<{ access_token: string }>('/auth/login', form);
  },
};

export interface ReadingProgress {
  document_id: string;
  current_page: number;
  total_pages: number;
  last_read_at: string;
}

export const docsApi = {
  list: (skip = 0, limit = 50) =>
    api.get<DocumentList>('/documents/', { params: { skip, limit } }),
  get: (id: string) => api.get<Document>(`/documents/${id}`),
  upload: (file: File, isPublic: boolean) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<Document>(`/documents/upload?is_public=${isPublic}`, form);
  },
  download: (id: string) =>
    api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  viewUrl: (id: string) => `/api/documents/${id}/view`,
  delete: (id: string) => api.delete(`/documents/${id}`),
};

export const progressApi = {
  list: () => api.get<ReadingProgress[]>('/reading-progress/'),
  get: (docId: string) => api.get<ReadingProgress | null>(`/reading-progress/${docId}`),
  save: (docId: string, currentPage: number, totalPages: number) =>
    api.put<ReadingProgress>(`/reading-progress/${docId}`, {
      current_page: currentPage,
      total_pages: totalPages,
    }),
};

export const adminApi = {
  users: () => api.get<User[]>('/admin/users'),
  toggleUser: (id: string) => api.patch<User>(`/admin/users/${id}/toggle-active`),
  stats: () => api.get<Stats>('/admin/stats'),
};

export default api;
