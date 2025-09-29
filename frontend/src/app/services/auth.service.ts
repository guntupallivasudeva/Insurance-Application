import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Prefer admin storage if present, else fall back to generic user storage
  getToken(): string | null {
    return localStorage.getItem('admin_token') || localStorage.getItem('token');
  }

  getUser(): any | null {
    const admin = localStorage.getItem('admin_data');
    if (admin) {
      try { return JSON.parse(admin); } catch { /* ignore */ }
    }
    const user = localStorage.getItem('user');
    if (user) {
      try { return JSON.parse(user); } catch { /* ignore */ }
    }
    return null;
  }

  getRole(): string | null {
    const u = this.getUser();
    return u?.role ?? null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    // Clear both admin and generic storages
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_data');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}
