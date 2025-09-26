import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminLoginRequest {
  email: string;
  password: string;
  role: string;
}

export interface AdminLoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface AdminErrorResponse {
  success?: false;
  error: string;
  errorCode?: string;
  suggestion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private userApiUrl = 'http://localhost:8000/api/v1/users';
  private adminApiUrl = 'http://localhost:8000/api/v1/admin';

  constructor(private http: HttpClient) {}

  login(credentials: AdminLoginRequest): Observable<AdminLoginResponse | AdminErrorResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<AdminLoginResponse | AdminErrorResponse>(
      `${this.userApiUrl}/login`, 
      credentials, 
      { headers }
    );
  }

  // Store token in localStorage
  setToken(token: string): void {
    localStorage.setItem('admin_token', token);
  }

  // Get token from localStorage
  getToken(): string | null {
    return localStorage.getItem('admin_token');
  }

  // Remove token from localStorage
  clearToken(): void {
    localStorage.removeItem('admin_token');
  }

  // Check if admin is logged in
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // Store admin data
  setAdminData(admin: any): void {
    localStorage.setItem('admin_data', JSON.stringify(admin));
  }

  // Get admin data
  getAdminData(): any | null {
    const adminData = localStorage.getItem('admin_data');
    return adminData ? JSON.parse(adminData) : null;
  }

  // Clear admin data
  clearAdminData(): void {
    localStorage.removeItem('admin_data');
  }

  // Logout
  logout(): void {
    this.clearToken();
    this.clearAdminData();
  }

  // Get authorization headers for admin API calls
  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Admin API methods using the admin middleware and controller
  getAllPolicies(): Observable<any> {
    return this.http.get(`${this.adminApiUrl}/getpolicies`, {
      headers: this.getAuthHeaders()
    });
  }

  getAllClaims(): Observable<any> {
    return this.http.get(`${this.adminApiUrl}/allclaims`, {
      headers: this.getAuthHeaders()
    });
  }

  getAllCustomers(): Observable<any> {
    return this.http.get(`${this.adminApiUrl}/customerdetails`, {
      headers: this.getAuthHeaders()
    });
  }

  getAllAgents(): Observable<any> {
    return this.http.get(`${this.adminApiUrl}/agents`, {
      headers: this.getAuthHeaders()
    });
  }

  getSummaryKPIs(): Observable<any> {
    return this.http.get(`${this.adminApiUrl}/summary`, {
      headers: this.getAuthHeaders()
    });
  }

  // Test admin authentication by calling a protected endpoint
  testAdminAuth(): Observable<any> {
    return this.http.get(`${this.adminApiUrl}/summary`, {
      headers: this.getAuthHeaders()
    });
  }
}