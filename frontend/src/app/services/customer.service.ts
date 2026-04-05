import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private customerApiUrl = 'http://localhost:8000/api/v1/customers';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  // Catalog policies available for purchase
  getCatalogPolicies(): Observable<any> {
    return this.http.get(`${this.customerApiUrl}/policies`, { headers: this.getAuthHeaders() });
  }

  // My purchased policies
  getMyPolicies(): Observable<any> {
    return this.http.get(`${this.customerApiUrl}/mypolicies`, { headers: this.getAuthHeaders() });
  }

  // My payments
  getMyPayments(): Observable<any> {
    return this.http.get(`${this.customerApiUrl}/payments`, { headers: this.getAuthHeaders() });
  }

  // Purchase
  purchasePolicy(payload: { policyProductId: string; startDate: string | Date; nominee?: { name: string; relation: string } }): Observable<any> {
    return this.http.post(`${this.customerApiUrl}/purchase`, payload, { headers: this.getAuthHeaders() });
  }

  // Pay (amount is derived on the server)
  makePayment(payload: { userPolicyId: string; method: 'Card' | 'Netbanking' | 'Offline' | 'UPI' | 'Simulated'; reference?: string }): Observable<any> {
    return this.http.post(`${this.customerApiUrl}/pay`, payload, { headers: this.getAuthHeaders() });
  }

  // Cancel
  cancelPolicy(userPolicyId: string): Observable<any> {
    return this.http.post(`${this.customerApiUrl}/cancelpolicy`, { userPolicyId }, { headers: this.getAuthHeaders() });
  }

  // Claims
  raiseClaim(payload: { userPolicyId: string; incidentDate: string | Date; description: string; amountClaimed: number }): Observable<any> {
    return this.http.post(`${this.customerApiUrl}/raiseclaim`, payload, { headers: this.getAuthHeaders() });
  }

  getMyClaims(): Observable<any> {
    return this.http.get(`${this.customerApiUrl}/myclaims`, { headers: this.getAuthHeaders() });
  }

  getClaimById(id: string): Observable<any> {
    return this.http.get(`${this.customerApiUrl}/claim/${id}`, { headers: this.getAuthHeaders() });
  }

  getPolicyById(id: string): Observable<any> {
    return this.http.get(`${this.customerApiUrl}/policy/${id}`, { headers: this.getAuthHeaders() });
  }
}
