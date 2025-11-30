const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface LoginRequest {
  emailAddress: string;
  password: string;
}

export interface User {
  id: number;
  fullName: string;
  emailAddress: string;
  role: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

class AuthService {
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private setAuthToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  private removeAuthToken(): void {
    localStorage.removeItem('auth_token');
  }

  private getUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  private setUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  private removeUser(): void {
    localStorage.removeItem('user');
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailAddress: email,
        password: password,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(error.detail || 'Login failed');
    }

    const data: LoginResponse = await response.json();
    
    // Store token and user
    this.setAuthToken(data.access_token);
    this.setUser(data.user);
    
    return data;
  }

  logout(): void {
    this.removeAuthToken();
    this.removeUser();
  }

  isAuthenticated(): boolean {
    return this.getAuthToken() !== null;
  }

  getToken(): string | null {
    return this.getAuthToken();
  }

  getCurrentUser(): User | null {
    return this.getUser();
  }

  async getCurrentUserInfo(): Promise<User | null> {
    const token = this.getAuthToken();
    if (!token) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Token might be invalid, clear it
        this.logout();
        return null;
      }

      const user: User = await response.json();
      this.setUser(user);
      return user;
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  }
}

export const authService = new AuthService();

