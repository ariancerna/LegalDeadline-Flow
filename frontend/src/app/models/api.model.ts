/** Página de Spring Data (solo los campos que usa el cliente). */
export interface Pagina<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/** Cuerpo de error uniforme del backend (ApiError). */
export interface ApiError {
  timestamp?: string;
  status: number;
  error?: string;
  code?: string;
  message?: string;
  path?: string;
  violations?: { campo: string; mensaje: string }[];
}
