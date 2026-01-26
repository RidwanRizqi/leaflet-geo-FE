/**
 * User model - matches backend User entity
 */
export interface User {
  id?: string;
  username?: string;
  nama?: string;
  idUnit?: string;
  role?: string;
  token?: string;
  isAdmin?: boolean;
  isActive?: boolean;
}

/**
 * Login request - matches backend LoginRequest DTO
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Login response - matches backend LoginResponse DTO
 */
export interface LoginResponse {
  nama: string;
  idUnit: string | null;
  role: string;
  token: string;
}

/**
 * API Response wrapper - matches backend ApiResponse<T>
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  totalCount: number | null;
}

/**
 * Change password request - matches backend ChangePasswordRequest DTO
 */
export interface ChangePasswordRequest {
  oldPass: string;
  newPass: string;
}
