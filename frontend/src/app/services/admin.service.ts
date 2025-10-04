import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { shareReplay, tap } from 'rxjs/operators';

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

  // Simple in-memory cache for DB status so navigating between routes
  // doesn't trigger a re-fetch or re-render flicker on the dashboard.
  private dbStatusCache: any | null = null;
  private dbStatusCachedAt = 0;
  // Short TTL for responsive updates while preventing unnecessary flicker
  private readonly dbStatusTTL = 30 * 1000; // 30 seconds

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

  // ---- Lightweight cache for claims to avoid flicker on tab switches ----
  private claimsCache: any[] | null = null;
  private claimsCachedAt = 0;
  private readonly claimsTTL = 30 * 1000; // 30 seconds
  getAllClaimsCached(options?: { force?: boolean }): Observable<any> {
    const force = !!options?.force;
    const fresh = (Date.now() - this.claimsCachedAt) < this.claimsTTL;
    if (!force && this.claimsCache && fresh) {
      return of({ claims: this.claimsCache });
    }
    return this.getAllClaims().pipe(
      tap((res: any) => {
        const list = Array.isArray(res?.claims) ? res.claims : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
        this.claimsCache = list || [];
        this.claimsCachedAt = Date.now();
      }),
      shareReplay(1)
    );
  }
  invalidateClaimsCache() { this.claimsCache = null; this.claimsCachedAt = 0; }

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

  // ---- Lightweight cache for aggregated customer details ----
  private customerDetailsCache: any[] | null = null;
  private customerDetailsCachedAt = 0;
  private readonly customerDetailsTTL = 30 * 1000; // 30 seconds
  getAllCustomerDetailsCached(options?: { force?: boolean }): Observable<any> {
    const force = !!options?.force;
    const fresh = (Date.now() - this.customerDetailsCachedAt) < this.customerDetailsTTL;
    if (!force && this.customerDetailsCache && fresh) {
      return of({ data: this.customerDetailsCache });
    }
    return this.getAllCustomerDetails().pipe(
      tap((res: any) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.customerDetailsCache = list || [];
        this.customerDetailsCachedAt = Date.now();
      }),
      shareReplay(1)
    );
  }
  invalidateCustomerDetailsCache() { this.customerDetailsCache = null; this.customerDetailsCachedAt = 0; }

  // ---- Lightweight cache for summary/KPI stats to prevent flicker ----
  private summaryCache: any | null = null;
  private summaryCachedAt = 0;
  private readonly summaryTTL = 30 * 1000; // 30 seconds for responsive updates
  getSummaryKPIsCached(options?: { force?: boolean }): Observable<any> {
    const force = !!options?.force;
    const fresh = (Date.now() - this.summaryCachedAt) < this.summaryTTL;
    if (!force && this.summaryCache && fresh) {
      return of(this.summaryCache);
    }
    return this.getSummaryKPIs().pipe(
      tap((res: any) => {
        this.summaryCache = res || {};
        this.summaryCachedAt = Date.now();
      }),
      shareReplay(1)
    );
  }
  invalidateSummaryCache() { this.summaryCache = null; this.summaryCachedAt = 0; }

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

  private userPoliciesCache: any[] | null = null;
  private userPoliciesCachedAt = 0;
  private readonly userPoliciesTTL = 30 * 1000; // 30 seconds for responsive updates
  getAllUserPoliciesCached(options?: { force?: boolean }): Observable<any> {
    const force = !!options?.force;
    const fresh = (Date.now() - this.userPoliciesCachedAt) < this.userPoliciesTTL;
    if (!force && this.userPoliciesCache && fresh) {
      return of({ policies: this.userPoliciesCache });
    }
    return this.getAllUserPolicies().pipe(
      tap((res: any) => {
        const list = Array.isArray(res?.policies) ? res.policies : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
        this.userPoliciesCache = list || [];
        this.userPoliciesCachedAt = Date.now();
      }),
      shareReplay(1)
    );
  }
  invalidateUserPoliciesCache() { this.userPoliciesCache = null; this.userPoliciesCachedAt = 0; }

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

  // Cached variant to avoid re-fetching when navigating back to the dashboard
  getDbStatusCached(options?: { force?: boolean }): Observable<any> {
    const force = !!options?.force;
    const fresh = (Date.now() - this.dbStatusCachedAt) < this.dbStatusTTL;
    if (!force && this.dbStatusCache && fresh) {
      return of(this.dbStatusCache);
    }
    return this.getDbStatus().pipe(
      tap((res) => {
        this.dbStatusCache = res || {};
        this.dbStatusCachedAt = Date.now();
      }),
      shareReplay(1)
    );
  }

  invalidateDbStatusCache(): void {
    this.dbStatusCache = null;
    this.dbStatusCachedAt = 0;
  }

  // Test admin authentication by calling a protected endpoint
  testAdminAuth(): Observable<any> {
    return this.http.get(`${this.adminApiUrl}/summary`, {
      headers: this.getAuthHeaders()
    });
  }

  // ---- Lightweight caches for lists to reduce flicker on tab switches ----
  private agentsCache: any[] | null = null;
  private agentsCachedAt = 0;
  private readonly agentsTTL = 30 * 1000; // 30 seconds for responsive updates
  getAllAgentsCached(options?: { force?: boolean }): Observable<any> {
    const force = !!options?.force;
    const fresh = (Date.now() - this.agentsCachedAt) < this.agentsTTL;
    if (!force && this.agentsCache && fresh) {
      return of({ agents: this.agentsCache });
    }
    return this.getAllAgents().pipe(
      tap((res: any) => {
        const list = Array.isArray(res?.agents) ? res.agents : (Array.isArray(res?.data) ? res.data : []);
        this.agentsCache = list || [];
        this.agentsCachedAt = Date.now();
      }),
      shareReplay(1)
    );
  }
  invalidateAgentsCache() { this.agentsCache = null; this.agentsCachedAt = 0; }

  private policiesCache: any[] | null = null;
  private policiesCachedAt = 0;
  private readonly policiesTTL = 30 * 1000; // 30 seconds for responsive updates
  getAllPoliciesCached(options?: { force?: boolean }): Observable<any> {
    const force = !!options?.force;
    const fresh = (Date.now() - this.policiesCachedAt) < this.policiesTTL;
    if (!force && this.policiesCache && fresh) {
      return of({ data: this.policiesCache });
    }
    return this.getAllPolicies().pipe(
      tap((res: any) => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.policiesCache = list || [];
        this.policiesCachedAt = Date.now();
      }),
      shareReplay(1)
    );
  }
  invalidatePoliciesCache() { this.policiesCache = null; this.policiesCachedAt = 0; }

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