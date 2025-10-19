import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CustomerService } from '../../services/customer.service';
import { VerificationService } from '../../services/verification.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-dashboard.html'
})
export class CustomerDashboard implements OnInit {
  roleTitle = 'Customer';
  userName = 'User';
  // Data
  isLoading = false;
  errorMessage = '';
  myPolicies: any[] = [];
  payments: any[] = [];
  catalog: any[] = [];
  claimedPolicies: any[] = [];
  claims: any[] = [];
  allPoliciesCombined: any[] = [];
  canceledPolicies: any[] = [];
  paymentInstallments: Record<string, number> = {}; // paymentId -> installment number (1-based)
  // paying state map per userPolicyId
  paying: Record<string, boolean> = {};
  successMessage = '';

  // UI state
  activeTab: string | null = null; // Start with null to show main dashboard
  showPurchaseModal = false;
  purchaseForm: any = { policyProductId: '', startDate: '', nomineeName: '', nomineeRelation: '' };
  purchaseError = '';

  showClaimModal = false;
  claimForm: any = { userPolicyId: '', incidentDate: '', description: '', amountClaimed: null };
  claimError = '';

  // Pay modal state
  showPayModal = false;
  payForm: any = { userPolicyId: '', method: 'Simulated' };
  payContext: any = { code: '', title: '', premium: 0, termMonths: 0, paidCount: 0 };
  payError = '';

  // Cancel policy modal state
  showCancelModal = false;
  cancelContext: any = null;
  cancelling = false;
  cancelError = '';

  // Policy details modal
  showDetailsModal = false;
  detailsContext: any = { policy: null, payments: [] };

  // Payment details modal
  showPaymentDetailsModal = false;
  paymentDetailsContext: any = null;

  // Success modal
  showSuccessModal = false;
  successModalData = {
    title: '',
    message: '',
    icon: 'success' // 'success', 'payment', 'purchase', 'claim'
  };

  // --- Helpers for premium scheduling ---
  nextDueDate(p: any): Date | null {
    if (!p) return null;
    if ((p.status || '').toLowerCase() !== 'approved') return null; // only track for approved
    const term = Number(p?._product?.termMonths ?? p?.policy?.termMonths ?? 0);
    if (!term) return null;
    const paid = this.countPaymentsForPolicy(p.userPolicyId || p._id);
    if (paid >= term) return null; // completed
    const start = new Date(p.startDate);
    if (isNaN(start.getTime())) return null;
    const due = new Date(start);
    // Business rule (updated): Each installment is due monthly AFTER the start date.
    // So the first payment is due at start + 1 month, second at start + 2 months, etc.
    // Therefore next due month index = paid + 1.
    due.setMonth(due.getMonth() + paid + 1);
    return due;
  }

  isCompleted(p: any): boolean {
    const term = Number(p?._product?.termMonths ?? p?.policy?.termMonths ?? 0);
    const paid = this.countPaymentsForPolicy(p.userPolicyId || p._id);
    return term > 0 && paid >= term;
  }

  isOverdue(p: any): boolean {
    const due = this.nextDueDate(p);
    if (!due) return false;
    const today = new Date();
    // Overdue if today is strictly after end of due day
    return today.getTime() > due.getTime() && !this.isCompleted(p);
  }

  isDueToday(p: any): boolean {
    const due = this.nextDueDate(p);
    if (!due) return false;
    const today = new Date();
    return today.getFullYear() === due.getFullYear() && today.getMonth() === due.getMonth() && today.getDate() === due.getDate();
  }

  formatDueDate(p: any): string {
    if (this.isCompleted(p)) return 'Completed';
    const due = this.nextDueDate(p);
    if (!due) return '—';
    const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: '2-digit' };
    const base = due.toLocaleDateString(undefined, opts);
    if (this.isOverdue(p)) return base + ' (Overdue)';
    if (this.isDueToday(p)) return base + ' (Today)';
    return base;
  }

  constructor(private auth: AuthService, private router: Router, private customer: CustomerService, public verificationService: VerificationService) {
    const role = (this.auth.getRole() || 'Customer').toString();
    this.roleTitle = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    const user = this.auth.getUser();
    this.userName = user?.name || user?.email || 'User';
  }

  setActiveTab(tab: string | null) {
    this.activeTab = tab;
  }

  showSuccessMessage(title: string, message: string, icon: string = 'success') {
    this.successModalData = { title, message, icon };
    this.showSuccessModal = true;
    // Auto close after 3 seconds
    setTimeout(() => {
      this.showSuccessModal = false;
    }, 3000);
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
  }

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll() {
    this.isLoading = true;
    this.errorMessage = '';
    forkJoin({
      myp: this.customer.getMyPolicies(),
      pays: this.customer.getMyPayments(),
      cat: this.customer.getCatalogPolicies(),
      cls: this.customer.getMyClaims()
    }).subscribe({
      next: ({ myp, pays, cat, cls }) => {
        const allPolicies = (myp?.policies || []).map((p: any) => ({
          ...p,
          _product: p.policy || null
        }));
        this.claimedPolicies = allPolicies.filter((p: any) => (p.status || '').toLowerCase() === 'claimed');
        this.canceledPolicies = allPolicies.filter((p: any) => (p.status || '').toLowerCase() === 'cancelled');
        // My Policies now excludes claimed & cancelled
        this.myPolicies = allPolicies.filter((p: any) => {
          const st = (p.status || '').toLowerCase();
            return st !== 'claimed' && st !== 'cancelled';
        });
        // Sort all policies by code and enrich with agent details
        this.allPoliciesCombined = allPolicies
          .map((p: any) => {
            let agentDetails = null;
            const prod = p._product || p.policy || {};
            // Try to get agent info from assignedAgentId or assignedAgentName
            if (prod.assignedAgentId && typeof prod.assignedAgentId === 'object') {
              agentDetails = {
                name: prod.assignedAgentId.name,
                email: prod.assignedAgentId.email,
                agentCode: prod.assignedAgentId.agentCode
              };
            } else if (prod.assignedAgentName) {
              agentDetails = { name: prod.assignedAgentName };
            }
            // Fallback to assignedAgentId on UserPolicy if populated
            if (!agentDetails && p.assignedAgentId && typeof p.assignedAgentId === 'object') {
              agentDetails = {
                name: p.assignedAgentId.name,
                email: p.assignedAgentId.email,
                agentCode: p.assignedAgentId.agentCode
              };
            }
            return { ...p, agentDetails };
          })
          .sort((a: any, b: any) => {
            const codeA = (a._product?.code || a.policy?.code || '').toString().toLowerCase();
            const codeB = (b._product?.code || b.policy?.code || '').toString().toLowerCase();
            return codeA.localeCompare(codeB);
          });
        this.payments = pays?.payments || [];
        // Sort catalog by code and enrich with agent details
        this.catalog = (cat?.policies || [])
          .map((pol: any) => {
            let agentDetails = null;
            if (pol.assignedAgentId && typeof pol.assignedAgentId === 'object') {
              agentDetails = {
                name: pol.assignedAgentId.name,
                email: pol.assignedAgentId.email,
                agentCode: pol.assignedAgentId.agentCode
              };
            } else if (pol.assignedAgentName) {
              agentDetails = { name: pol.assignedAgentName };
            }
            return { ...pol, agentDetails };
          })
          .sort((a: any, b: any) => {
            const codeA = (a.code || '').toString().toLowerCase();
            const codeB = (b.code || '').toString().toLowerCase();
            return codeA.localeCompare(codeB);
          });
        this.claims = (cls?.claims || []);
        this.computePaymentInstallments();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || err?.message || 'Failed to load customer data';
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  // Purchase flow
  openPurchase(policy: any) {
    this.purchaseForm = {
      policyProductId: policy?._id || policy?.policyProductId || '',
      startDate: new Date().toISOString().substring(0, 10),
      nomineeName: '',
      nomineeRelation: ''
    };
    this.purchaseError = '';
    this.showPurchaseModal = true;
  }

  submitPurchase() {
    const { policyProductId, startDate, nomineeName, nomineeRelation } = this.purchaseForm;
    const payload: any = { policyProductId, startDate };
    if (nomineeName && nomineeRelation) {
      payload.nominee = { name: nomineeName, relation: nomineeRelation };
    }
    this.purchaseError = '';
    this.customer.purchasePolicy(payload).subscribe({
      next: () => {
        this.showPurchaseModal = false;
        this.showSuccessMessage(
          'Policy Purchased Successfully!', 
          'Your policy has been purchased and is pending approval from an agent.',
          'purchase'
        );
        this.loadAll();
      },
      error: (err) => {
        this.purchaseError = err?.error?.message || (Array.isArray(err?.error?.error) ? err.error.error[0]?.message : '') || 'Purchase failed';
      }
    });
  }

  // Claim flow
  openRaiseClaim(p: any) {
    this.claimForm = {
      userPolicyId: p.userPolicyId,
      incidentDate: new Date().toISOString().substring(0, 10),
      description: '',
      amountClaimed: null
    };
    this.claimError = '';
    this.showClaimModal = true;
  }

  submitClaim() {
    const { userPolicyId, incidentDate, description, amountClaimed } = this.claimForm;
    this.claimError = '';
    this.customer.raiseClaim({ userPolicyId, incidentDate, description, amountClaimed: Number(amountClaimed) }).subscribe({
      next: () => {
        this.showClaimModal = false;
        this.showSuccessMessage(
          'Claim Submitted Successfully!',
          'Your claim has been submitted and is under review. You will be notified of the status.',
          'claim'
        );
        this.successMessage = 'Claim submitted successfully.';
        // Refresh claims list (quick incremental fetch)
        this.customer.getMyClaims().subscribe({
          next: (res: any) => { this.claims = res?.claims || this.claims; },
          error: () => {}
        });
      },
      error: (err) => {
        this.claimError = err?.error?.message || 'Failed to raise claim';
      }
    });
  }

  // Open global claim center (without pre-selecting a policy)
  openClaimCenter() {
    const list = this.approvedClaimablePolicies();
    this.claimForm = {
      userPolicyId: list.length === 1 ? (list[0].userPolicyId || list[0]._id) : '',
      incidentDate: new Date().toISOString().substring(0, 10),
      description: '',
      amountClaimed: null
    };
    this.claimError = '';
    this.showClaimModal = true;
  }

  // Filter only approved, non-claimed policies
  approvedClaimablePolicies() {
    const approved = (this.myPolicies || []).filter(p => (p.status || '').toLowerCase() === 'approved');
    return approved;
  }

  // Claims filtered helpers
  recentClaims(limit = 5) {
    return [...(this.claims || [])].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, limit);
  }

  // Cancel policy
  cancelPolicy(p: any) {
    if (!p) return;
    this.cancelContext = p;
    this.cancelError = '';
    this.showCancelModal = true;
  }

  performCancel() {
    if (!this.cancelContext) return;
    const upId = this.cancelContext.userPolicyId || this.cancelContext._id;
    if (!upId) { this.cancelError = 'Missing policy reference.'; return; }
    this.cancelling = true;
    this.cancelError = '';
    this.customer.cancelPolicy(upId).subscribe({
      next: () => {
        this.cancelling = false;
        this.showCancelModal = false;
        this.showSuccessMessage(
          'Policy Cancelled Successfully',
          'Your policy has been cancelled. You will receive a confirmation email shortly.',
          'success'
        );
        this.cancelContext = null;
        this.loadAll();
      },
      error: (err) => {
        this.cancelling = false;
        this.cancelError = err?.error?.message || 'Failed to cancel policy';
      }
    });
  }

  closeCancelModal() {
    if (this.cancelling) return; // prevent closing mid-request
    this.showCancelModal = false;
    this.cancelContext = null;
    this.cancelError = '';
  }

  // --- Payments: pay current month for an approved policy ---
  payMonthly(p: any) {
    const userPolicyId: string = p?.userPolicyId || p?._id;
    if (!userPolicyId) { alert('Missing policy reference'); return; }
    if ((p?.status || '').toLowerCase() !== 'approved') { alert('Policy must be approved to pay'); return; }
    const premium = Number(p?._product?.premium ?? p?.policy?.premium ?? 0);
    const term = Number(p?._product?.termMonths ?? p?.policy?.termMonths ?? 0);
    if (!premium || premium <= 0) { alert('Invalid premium amount on policy'); return; }
    const paidCount = this.countPaymentsForPolicy(userPolicyId);
    if (term && paidCount >= term) { alert('All term payments completed'); return; }

    // Open Pay modal with auto-filled info
    this.payForm = { userPolicyId, method: 'Simulated' };
    this.payContext = {
      code: p?._product?.code || p?.policy?.code || '',
      title: p?._product?.title || p?.policy?.title || '',
      premium,
      termMonths: term,
      paidCount
    };
    this.payError = '';
    this.showPayModal = true;
  }

  submitPayment() {
    const { userPolicyId, method } = this.payForm || {};
    if (!userPolicyId || !method) { this.payError = 'Please select a payment method.'; return; }
    this.payError = '';
    this.paying[userPolicyId] = true;
    this.successMessage = '';
    this.customer.makePayment({ userPolicyId, method }).subscribe({
      next: (resp: any) => {
        this.showPayModal = false;
        this.showSuccessMessage(
          'Payment Successful!',
          `Payment of ₹${this.payContext.premium} has been processed successfully using ${method}.`,
          'payment'
        );
        this.successMessage = resp?.message || 'Payment successful for this month.';
        // Refresh only payments
        this.customer.getMyPayments().subscribe({
          next: (pays: any) => {
            this.payments = pays?.payments || [];
            this.computePaymentInstallments();
            this.computePaymentInstallments();
          },
          error: () => {}
        });
        // Update the count in modal context if provided
        if (resp?.meta?.paidCount != null) {
          this.payContext.paidCount = resp.meta.paidCount;
        }
      },
      error: (err) => {
        this.payError = err?.error?.message || 'Payment failed';
      },
      complete: () => {
        this.paying[userPolicyId] = false;
      }
    });
  }

  // Count number of payments recorded for a specific user policy
  countPaymentsForPolicy(userPolicyId: string): number {
    return this.payments.filter((pay: any) => {
      const id = typeof pay?.userPolicyId === 'string' ? pay.userPolicyId : pay?.userPolicyId?._id;
      return id === userPolicyId;
    }).length;
  }

  // Map a payment row to policy code/title for display
  policyLabelForPayment(pay: any): string {
    const pid = typeof pay?.userPolicyId === 'string' ? pay.userPolicyId : pay?.userPolicyId?._id;
    let mp = this.myPolicies.find(x => (x?.userPolicyId || x?._id) === pid)
      || this.claimedPolicies.find(x => (x?.userPolicyId || x?._id) === pid)
      || this.canceledPolicies.find(x => (x?.userPolicyId || x?._id) === pid);
    const code = mp?._product?.code || mp?.policy?.code || pid || '-';
    const title = mp?._product?.title || mp?.policy?.title || '';
    return title ? `${code} — ${title}` : `${code}`;
  }

  private computePaymentInstallments() {
    this.paymentInstallments = {};
    if (!this.payments?.length) return;
    // Group payments by policy
    const grouped: Record<string, any[]> = {};
    for (const pay of this.payments) {
      const upId = typeof pay.userPolicyId === 'string' ? pay.userPolicyId : pay?.userPolicyId?._id;
      if (!upId) continue;
      if (!grouped[upId]) grouped[upId] = [];
      grouped[upId].push(pay);
    }
    Object.keys(grouped).forEach(upId => {
      grouped[upId].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      grouped[upId].forEach((p, idx) => {
        const pid = p._id || `${upId}-${idx}`;
        this.paymentInstallments[pid] = idx + 1; // 1-based installment number
      });
    });
  }

  paymentInstallmentLabel(pay: any): string {
    const upId = typeof pay.userPolicyId === 'string' ? pay.userPolicyId : pay?.userPolicyId?._id;
    const mp = this.myPolicies.find(x => (x?.userPolicyId || x?._id) === upId);
    const total = Number(mp?._product?.termMonths ?? mp?.policy?.termMonths ?? 0) || 0;
    const inst = this.paymentInstallments[pay._id] || '?';
    return total ? `${inst} / ${total}` : `${inst}`;
  }

  private formatMonthYear(d: Date | null): string {
    if (!d) return '-';
    return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }

  paymentDueMonth(pay: any): string {
    if (!pay) return '-';
    const inst = this.paymentInstallments[pay._id];
    if (!inst) return '-';
    const upId = typeof pay.userPolicyId === 'string' ? pay.userPolicyId : pay?.userPolicyId?._id;
    const mp = this.myPolicies.find(x => (x?.userPolicyId || x?._id) === upId);
    if (!mp) return '-';
    const start = new Date(mp.startDate);
    if (isNaN(start.getTime())) return '-';
    // Installment n due at start + n months (business rule)
    const due = new Date(start);
    due.setMonth(due.getMonth() + inst);
    return this.formatMonthYear(due);
  }

  // --- Policy Details Modal ---
  openPolicyDetails(p: any) {
    const userPolicyId: string = p?.userPolicyId || p?._id;
    // Enrich agent details for modal
    let agentDetails = null;
    const prod = p._product || p.policy || {};
    if (prod.assignedAgentId && typeof prod.assignedAgentId === 'object') {
      agentDetails = {
        name: prod.assignedAgentId.name,
        email: prod.assignedAgentId.email,
        agentCode: prod.assignedAgentId.agentCode
      };
    } else if (prod.assignedAgentName) {
      agentDetails = { name: prod.assignedAgentName };
    }
    if (!agentDetails && p.assignedAgentId && typeof p.assignedAgentId === 'object') {
      agentDetails = {
        name: p.assignedAgentId.name,
        email: p.assignedAgentId.email,
        agentCode: p.assignedAgentId.agentCode
      };
    }
    const policyRef = { ...p, agentDetails };
    const relatedPayments = this.payments
      .filter(pay => {
        const id = typeof pay?.userPolicyId === 'string' ? pay.userPolicyId : pay?.userPolicyId?._id;
        return id === userPolicyId;
      })
      .map(pay => ({
        ...pay,
        installment: this.paymentInstallments[pay._id] || null,
        dueMonth: this.paymentDueMonth(pay)
      }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    this.detailsContext = { policy: policyRef, payments: relatedPayments };
    this.showDetailsModal = true;
  }

  closePolicyDetails() {
    this.showDetailsModal = false;
    this.detailsContext = { policy: null, payments: [] };
  }

  // Get policy icon based on policy type
  getPolicyIcon(policy: any): { icon: string; color: string; bgColor: string } {
    const code = (policy.code || '').toLowerCase();
    const title = (policy.title || '').toLowerCase();
    
    // Health/Medical Insurance
    if (code.includes('health') || title.includes('health') || title.includes('medical')) {
      return {
        icon: 'health',
        color: 'text-red-600',
        bgColor: 'bg-red-100'
      };
    }
    
    // Auto/Car Insurance
    if (code.includes('auto') || code.includes('car') || title.includes('auto') || title.includes('car')) {
      return {
        icon: 'car',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
      };
    }
    
    // Life Insurance
    if (code.includes('life') || title.includes('life')) {
      return {
        icon: 'life',
        color: 'text-purple-600',
        bgColor: 'bg-purple-100'
      };
    }
    
    // Home/House Insurance
    if (code.includes('home') || code.includes('house') || title.includes('home') || title.includes('house')) {
      return {
        icon: 'home',
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      };
    }
    
    // Bike/Motorcycle Insurance
    if (code.includes('bike') || code.includes('motorcycle') || title.includes('bike') || title.includes('motorcycle')) {
      return {
        icon: 'bike',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100'
      };
    }
    
    // Travel Insurance
    if (code.includes('travel') || title.includes('travel')) {
      return {
        icon: 'travel',
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100'
      };
    }
    
    // Default generic insurance icon
    return {
      icon: 'shield',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    };
  }

  // View payment details method
  viewPaymentDetails(payment: any) {
    this.paymentDetailsContext = payment;
    this.showPaymentDetailsModal = true;
  }

  closePaymentDetailsModal() {
    this.showPaymentDetailsModal = false;
    this.paymentDetailsContext = null;
  }
}
