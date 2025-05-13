export const API_BASE_URL = 'http://127.0.0.1:8000';

export const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}/${path}`;
};