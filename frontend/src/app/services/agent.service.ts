import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardStats {
  totalPolicies: number;
  approvedPolicies: number;
  pendingPolicies: number;
  totalClaims: number;
  pendingClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  totalPayments: number;
  totalPaymentAmount: number;
  totalCustomers: number;
  approvedCustomers: number;
}

export interface Policy {
  policyProductId: string;
  code: string;
  title: string;
  description: string;
  premium: number;
  termMonths: number;
  minSumInsured: number;
  maxSumInsured: number;
  customerCount: number;
  createdAt: string;
}

export interface PaymentRecord {
  paymentId: string;
  amount: number;
  method: string;
  paymentDate: string;
  reference?: string;
  status: string;
}

export interface PaymentCustomer {
  customerId: string;
  customerName: string;
  customerEmail: string;
  policyTitle: string;
  policyCode: string;
  policyNumber?: string;
  policyPremium: number;
  policyStatus: string;
  policyStartDate: string;
  policyEndDate: string;
  totalPayments: number;
  totalAmount: number;
  lastPaymentDate: string;
  primaryPaymentMethod: string;
  paymentHistory: PaymentRecord[];
}

export interface Customer {
  userPolicyId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  status: string;
  startDate: string;
  endDate: string;
  premiumPaid: number;
  verificationType: string;
  createdAt: string;
  policyCode: string;
  policyTitle: string;
  policyPremium: number;
  policyNumber?: string;
  policyType?: string;
  purchaseDate?: string;
  totalPremium?: number;
  paymentMethod?: string;
  installmentsDone?: number;
  totalInstallments?: number;
  nextPaymentDate?: string;
  coverageAmount?: number;
  deductible?: number;
  policyTerm?: string;
  renewalDate?: string;
}

export interface CustomerPayment {
  paymentId: string;
  amount: number;
  method: string;
  reference: string;
  paymentDate: string;
  customerName: string;
  customerEmail: string;
}

export interface PolicyRequest {
  userPolicyId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  policyId: string;
  policyCode: string;
  policyTitle: string;
  premium: number;
  termMonths: number;
  status: string;
  requestDate: string;
  verificationType: string;
}

export interface CustomerPaymentHistory {
  success: boolean;
  userPolicy: {
    userPolicyId: string;
    customerName: string;
    customerEmail: string;
    policyCode: string;
    policyTitle: string;
    policyPremium: number;
    status: string;
    startDate: string;
    endDate: string;
    premiumPaid: number;
  };
  payments: CustomerPayment[];
  totalPayments: number;
  totalAmount: number;
}

export interface Claim {
  claimId: string;
  incidentDate: string;
  description: string;
  amountClaimed: number;
  status: string;
  decisionNotes?: string;
  customerName: string;
  customerEmail: string;
  policyId: string;
  decidedBy?: string;
  createdAt: string;
}

export interface Payment {
  paymentId: string;
  amount: number;
  method: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  policyId: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private baseUrl = 'http://localhost:8000/api/v1/agents';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Dashboard Stats
  getDashboardStats(): Observable<{ success: boolean; stats: DashboardStats }> {
    return this.http.get<{ success: boolean; stats: DashboardStats }>(
      `${this.baseUrl}/dashboard`,
      { headers: this.getHeaders() }
    );
  }

  // Policy Management
  getAssignedPolicies(): Observable<{ success: boolean; policies: Policy[] }> {
    return this.http.get<{ success: boolean; policies: Policy[] }>(
      `${this.baseUrl}/assignedpolicies`,
      { headers: this.getHeaders() }
    );
  }

  getPolicyCustomers(policyProductId: string): Observable<{ success: boolean; customers: Customer[] }> {
    return this.http.get<{ success: boolean; customers: Customer[] }>(
      `${this.baseUrl}/policy-customers/${policyProductId}`,
      { headers: this.getHeaders() }
    );
  }

  getCustomerPayments(userPolicyId: string): Observable<CustomerPaymentHistory> {
    return this.http.get<CustomerPaymentHistory>(
      `${this.baseUrl}/customer-payments/${userPolicyId}`,
      { headers: this.getHeaders() }
    );
  }

  approvePolicy(policyId: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/approvepolicy`,
      { userPolicyId: policyId },
      { headers: this.getHeaders() }
    );
  }

  // Claims Management
  getAssignedClaims(): Observable<{ success: boolean; claims: Claim[] }> {
    return this.http.get<{ success: boolean; claims: Claim[] }>(
      `${this.baseUrl}/assignedclaims`,
      { headers: this.getHeaders() }
    );
  }

  getClaimById(claimId: string): Observable<{ success: boolean; claim: Claim }> {
    return this.http.get<{ success: boolean; claim: Claim }>(
      `${this.baseUrl}/claims/${claimId}`,
      { headers: this.getHeaders() }
    );
  }

  approveClaim(claimId: string, decisionNotes?: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/approveclaim`,
      { claimId, decisionNotes },
      { headers: this.getHeaders() }
    );
  }

  rejectClaim(claimId: string, decisionNotes?: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/rejectclaim`,
      { claimId, decisionNotes },
      { headers: this.getHeaders() }
    );
  }

  // Payment Management
  getAssignedPayments(): Observable<{ success: boolean; payments: Payment[] }> {
    return this.http.get<{ success: boolean; payments: Payment[] }>(
      `${this.baseUrl}/assignedpayments`,
      { headers: this.getHeaders() }
    );
  }

  // Policy Request Management
  getPolicyRequests(): Observable<{ success: boolean; requests: PolicyRequest[] }> {
    return this.http.get<{ success: boolean; requests: PolicyRequest[] }>(
      `${this.baseUrl}/policy-requests`,
      { headers: this.getHeaders() }
    );
  }

  approvePolicyRequest(userPolicyId: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.baseUrl}/approve-policy-request/${userPolicyId}`,
      {},
      { headers: this.getHeaders() }
    );
  }

  rejectPolicyRequest(userPolicyId: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.baseUrl}/reject-policy-request/${userPolicyId}`,
      {},
      { headers: this.getHeaders() }
    );
  }

  getApprovedCustomers(): Observable<{ success: boolean; customers: Customer[] }> {
    return this.http.get<{ success: boolean; customers: Customer[] }>(
      `${this.baseUrl}/approved-customers`,
      { headers: this.getHeaders() }
    );
  }

  getPaymentCustomers(): Observable<{ success: boolean; customers: PaymentCustomer[] }> {
    return this.http.get<{ success: boolean; customers: PaymentCustomer[] }>(
      `${this.baseUrl}/payment-customers`,
      { headers: this.getHeaders() }
    );
  }
}