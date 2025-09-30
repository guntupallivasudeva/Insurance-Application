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

  // Get token from localStorage (fallback to generic user token)
  getToken(): string | null {
    return localStorage.getItem('admin_token') || localStorage.getItem('token');
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
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // Admin API methods using the admin middleware and controller
  getAllPolicies(): Observable<any> {
    return this.http.get(`${this.adminApiUrl}/getpolicies`, {
      headers: this.getAuthHeaders()
    });
  }

  getPolicyById(id: string): Observable<any> {
    return this.http.get(`${this.adminApiUrl}/policy/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  addPolicy(payload: {
    code: string;
    title: string;
    description: string;
    premium: number;
    termMonths: number;
    minSumInsured?: number;
    maxSumInsured?: number;
  }): Observable<any> {
    return this.http.post(`${this.adminApiUrl}/addpolicies`, payload, {
      headers: this.getAuthHeaders()
    });
  }

  updatePolicy(id: string, payload: Partial<{
    code: string;
    title: string;
    description: string;
    premium: number;
    termMonths: number;
    minSumInsured: number;
    maxSumInsured: number;
  }>): Observable<any> {
    return this.http.put(`${this.adminApiUrl}/updatepolicies/${id}`, payload, {
      headers: this.getAuthHeaders()
    });
  }

  deletePolicy(id: string): Observable<any> {
    return this.http.delete(`${this.adminApiUrl}/deletepolicies/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  getAllClaims(): Observable<any> {
    return this.http.get(`${this.adminApiUrl}/allclaims`, {
      headers: this.getAuthHeaders()
    });
  }

  // Optionally filter pending claims client-side until a dedicated endpoint exists
  getPendingClaims(): Observable<any> {
    return this.getAllClaims();
  }

  getAllCustomers(): Observable<any> {
    return this.http.get(`${this.adminApiUrl}/customerdetails`, {
      headers: this.getAuthHeaders()
    });
  }

  // Aggregated customer details (customer + policies + payments)
  getAllCustomerDetails(): Observable<any> {
    return this.http.get(`${this.adminApiUrl}/customerdetails`, {
      headers: this.getAuthHeaders()
    });
  }

  getAllAgents(): Observable<any> {
    return this.http.get(`${this.adminApiUrl}/agents`, {
      headers: this.getAuthHeaders()
    });
  }

  createAgent(payload: { name: string; email: string; password: string; branch?: string; phone?: string; agentCode?: string }): Observable<any> {
    return this.http.post(`${this.adminApiUrl}/createagent`, payload, {
      headers: this.getAuthHeaders()
    });
  }

  updateAgent(id: string, payload: Partial<{ name: string; email: string; password: string; branch?: string; phone?: string; agentCode?: string }>): Observable<any> {
    return this.http.put(`${this.adminApiUrl}/updateagent/${id}`, payload, {
      headers: this.getAuthHeaders()
    });
  }

  deleteAgent(id: string): Observable<any> {
    return this.http.delete(`${this.adminApiUrl}/deleteagent/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  getAllUserPolicies(): Observable<any> {
    return this.http.get(`${this.adminApiUrl}/userpolicies`, {
      headers: this.getAuthHeaders()
    });
  }

  getSummaryKPIs(): Observable<any> {
    return this.http.get(`${this.adminApiUrl}/summary`, {
      headers: this.getAuthHeaders()
    });
  }

  getDbStatus(): Observable<any> {
    return this.http.get(`${this.adminApiUrl}/db-status`, {
      headers: this.getAuthHeaders()
    });
  }

  // Test admin authentication by calling a protected endpoint
  testAdminAuth(): Observable<any> {
    return this.http.get(`${this.adminApiUrl}/summary`, {
      headers: this.getAuthHeaders()
    });
  }

  approveClaim(claimId: string): Observable<any> {
    return this.http.post(`${this.adminApiUrl}/approveclaim`, { claimId, status: 'Approved' }, {
      headers: this.getAuthHeaders()
    });
  }

  rejectClaim(claimId: string): Observable<any> {
    return this.http.post(`${this.adminApiUrl}/approveclaim`, { claimId, status: 'Rejected' }, {
      headers: this.getAuthHeaders()
    });
  }

  updateClaim(id: string, payload: Partial<{ incidentDate: string | Date; description: string; amountClaimed: number; decisionNotes: string }>): Observable<any> {
    return this.http.put(`${this.adminApiUrl}/claim/${id}`, payload, {
      headers: this.getAuthHeaders()
    });
  }

  approveUserPolicy(userPolicyId: string): Observable<any> {
    return this.http.post(`${this.adminApiUrl}/approvepolicy`, { userPolicyId }, {
      headers: this.getAuthHeaders()
    });
  }

  rejectUserPolicy(userPolicyId: string): Observable<any> {
    return this.http.post(`${this.adminApiUrl}/rejectpolicy`, { userPolicyId }, {
      headers: this.getAuthHeaders()
    });
  }

  assignPolicyToAgent(policyProductId: string, agentId: string): Observable<any> {
    return this.http.post(`${this.adminApiUrl}/assignpolicy`, { policyProductId, agentId }, {
      headers: this.getAuthHeaders()
    });
  }
  
  unassignPolicyFromAgent(policyProductId: string): Observable<any> {
    return this.http.post(`${this.adminApiUrl}/unassign-policy`, { policyProductId }, {
      headers: this.getAuthHeaders()
    });
  }
}