import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AgentService, DashboardStats, Policy, Claim, Payment, Customer, CustomerPaymentHistory, PolicyRequest, PaymentCustomer } from '../../services/agent.service';
import { VerificationService } from '../../services/verification.service';

@Component({
  selector: 'app-agent-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agent-dashboard.html',
  styleUrls: ['./agent-dashboard.css']
})
export class AgentDashboard implements OnInit {
  roleTitle = 'Agent';
  userName = 'User';
  activeTab: string | null = null; // Start with null to show main dashboard
  
  // Data properties
  dashboardStats: DashboardStats = {
    totalPolicies: 0,
    approvedPolicies: 0,
    pendingPolicies: 0,
    totalClaims: 0,
    pendingClaims: 0,
    approvedClaims: 0,
    rejectedClaims: 0,
    totalPayments: 0,
    totalPaymentAmount: 0,
    totalCustomers: 0,
    approvedCustomers: 0
  };
  
  policies: Policy[] = [];
  claims: Claim[] = [];
  payments: Payment[] = [];
  policyCustomers: Customer[] = [];
  policyRequests: PolicyRequest[] = [];
  approvedCustomers: Customer[] = [];
  paymentCustomers: PaymentCustomer[] = [];
  activePaymentCustomer: PaymentCustomer | null = null;
  customerPaymentHistory: CustomerPaymentHistory | null = null;
  
  // Loading states
  loading = {
    policies: false,
    claims: false,
    payments: false,
    stats: false,
    customers: false,
    customerPayments: false,
    customerDetails: false,
    policyRequests: false,
    approvedCustomers: false,
    approvingPolicy: null as string | null,
    rejectingPolicy: null as string | null
  };
  
  // Modal states
  showPolicyModal = false;
  showClaimModal = false;
  showCustomersModal = false;
  showPaymentHistoryModal = false;
  showCustomerDetailsModal = false;
  showPolicyRequestDetailsModal = false;
  showApprovedCustomerDetailsModal = false;
  showPolicyHistoryModal = false;
  showEditClaimModal = false;
  showSuccessModal = false;
  showErrorModal = false;
  showApproveConfirmModal = false;
  showRejectConfirmModal = false;
  selectedPolicy: Policy | null = null;
  selectedClaim: Claim | null = null;
  editingClaim: Claim | null = null;
  selectedCustomer: Customer | null = null;
  selectedCustomerDetails: Customer | null = null;
  selectedPolicyRequest: PolicyRequest | null = null;
  selectedApprovedCustomer: Customer | null = null;
  pendingActionRequest: PolicyRequest | null = null;
  decisionNotes = '';
  modalTitle = '';
  modalMessage = '';
  claimForm: { incidentDate: string; amountClaimed: number | null; description: string; decisionNotes: string } = { incidentDate: '', amountClaimed: null, description: '', decisionNotes: '' };

  constructor(
    private auth: AuthService, 
    private router: Router,
    private agentService: AgentService,
    public verificationService: VerificationService
  ) {
    const role = (this.auth.getRole() || 'Agent').toString();
    this.roleTitle = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    const user = this.auth.getUser();
    this.userName = user?.name || user?.email || 'User';
  }

  ngOnInit() {
    // Check if there's a saved tab state from refresh
    const savedTab = sessionStorage.getItem('agentDashboard.activeTab');
    if (savedTab && savedTab !== 'null') {
      this.activeTab = savedTab;
    }
    
    // Load initial data immediately for fast rendering
    this.loadDashboardData();
  }

  loadDashboardData() {
    // Load critical data immediately for main dashboard
    this.loadDashboardStats();
    
    // Load other data in background to prevent blocking UI
    setTimeout(() => {
      this.loadPolicies();
      this.loadClaims();
      this.loadPolicyRequests();
    }, 0);
  }

  setActiveTab(tab: string | null) {
    this.activeTab = tab;
    
    // Save the current tab state for refresh preservation
    if (tab) {
      sessionStorage.setItem('agentDashboard.activeTab', tab);
    } else {
      sessionStorage.removeItem('agentDashboard.activeTab');
    }
    
    // Load data specific to the tab when it's activated
    if (tab === 'approved-customers' && this.approvedCustomers.length === 0) {
      this.loadApprovedCustomers();
    } else if (tab === 'management' && this.policyRequests.length === 0) {
      this.loadPolicyRequests();
    } else if (tab === 'payments' && this.paymentCustomers.length === 0) {
      this.loadPaymentCustomers();
    }
  }

  loadApprovedCustomers() {
    this.loading.approvedCustomers = true;
    // Get all customers with approved policies assigned to this agent
    this.agentService.getApprovedCustomers().subscribe({
      next: (response) => {
        if (response.success) {
          this.approvedCustomers = response.customers;
        }
        this.loading.approvedCustomers = false;
      },
      error: (error) => {
        console.error('Error loading approved customers:', error);
        this.loading.approvedCustomers = false;
      }
    });
  }

  loadPaymentCustomers() {
    console.log('Loading payment customers...');
    this.loading.payments = true;
    this.agentService.getPaymentCustomers().subscribe({
      next: (response) => {
        console.log('Payment customers response:', response);
        if (response.success) {
          this.paymentCustomers = response.customers;
          console.log('Payment customers loaded:', this.paymentCustomers);
          // Set first customer as active by default
          if (response.customers.length > 0) {
            this.activePaymentCustomer = response.customers[0];
            console.log('Active payment customer set:', this.activePaymentCustomer);
          }
        }
        this.loading.payments = false;
      },
      error: (error) => {
        console.error('Error loading payment customers:', error);
        this.loading.payments = false;
      }
    });
  }

  setActivePaymentCustomer(customer: PaymentCustomer) {
    this.activePaymentCustomer = customer;
  }

  loadDashboardStats() {
    this.loading.stats = true;
    this.agentService.getDashboardStats().subscribe({
      next: (response) => {
        if (response.success) {
          this.dashboardStats = response.stats;
        }
        this.loading.stats = false;
      },
      error: (error) => {
        console.error('Error loading dashboard stats:', error);
        this.loading.stats = false;
      }
    });
  }

  loadPolicies() {
    this.loading.policies = true;
    this.agentService.getAssignedPolicies().subscribe({
      next: (response) => {
        if (response.success) {
          this.policies = response.policies;
        }
        this.loading.policies = false;
      },
      error: (error) => {
        console.error('Error loading policies:', error);
        this.loading.policies = false;
      }
    });
  }

  loadClaims() {
    this.loading.claims = true;
    this.agentService.getAssignedClaims().subscribe({
      next: (response) => {
        if (response.success) {
          this.claims = response.claims;
        }
        this.loading.claims = false;
      },
      error: (error) => {
        console.error('Error loading claims:', error);
        this.loading.claims = false;
      }
    });
  }

  loadPayments() {
    this.loading.payments = true;
    this.agentService.getAssignedPayments().subscribe({
      next: (response) => {
        if (response.success) {
          this.payments = response.payments;
        }
        this.loading.payments = false;
      },
      error: (error) => {
        console.error('Error loading payments:', error);
        this.loading.payments = false;
      }
    });
  }

  approvePolicy(policyId: string) {
    this.agentService.approvePolicy(policyId).subscribe({
      next: (response) => {
        if (response.success) {
          // Refresh data
          this.loadPolicies();
          this.loadDashboardStats();
            this.showSuccessMessage('Success!', 'Policy approved successfully!');
        }
      },
      error: (error) => {
        console.error('Error approving policy:', error);
          this.showErrorMessage('Error!', 'Error approving policy. Please try again.');
      }
    });
  }

  approveCustomerPolicy(userPolicyId: string) {
    this.agentService.approvePolicy(userPolicyId).subscribe({
      next: (response) => {
        if (response.success) {
          // Refresh customers list and dashboard stats
          if (this.selectedPolicy) {
            this.loadPolicyCustomers(this.selectedPolicy.policyProductId);
          }
          this.loadDashboardStats();
            this.showSuccessMessage('Success!', 'Customer policy approved successfully!');
        }
      },
      error: (error) => {
        console.error('Error approving customer policy:', error);
          this.showErrorMessage('Error!', 'Error approving policy. Please try again.');
      }
    });
  }

  approveClaim(claimId: string) {
    this.agentService.approveClaim(claimId, this.decisionNotes).subscribe({
      next: (response) => {
        if (response.success) {
          // Refresh data
          this.loadClaims();
          this.loadDashboardStats();
          this.decisionNotes = '';
            this.showSuccessMessage('Success!', 'Claim approved successfully!');
        }
      },
      error: (error) => {
        console.error('Error approving claim:', error);
          this.showErrorMessage('Error!', 'Error approving claim. Please try again.');
      }
    });
  }

  rejectClaim(claimId: string) {
    this.agentService.rejectClaim(claimId, this.decisionNotes).subscribe({
      next: (response) => {
        if (response.success) {
          // Refresh data
          this.loadClaims();
          this.loadDashboardStats();
          this.decisionNotes = '';
            this.showSuccessMessage('Success!', 'Claim rejected successfully!');
        }
      },
      error: (error) => {
        console.error('Error rejecting claim:', error);
          this.showErrorMessage('Error!', 'Error rejecting claim. Please try again.');
      }
    });
  }

  viewPolicy(policy: Policy) {
    this.selectedPolicy = policy;
    this.showPolicyModal = true;
  }

  viewPolicyCustomers(policy: Policy) {
    this.selectedPolicy = policy;
    this.loadPolicyCustomers(policy.policyProductId);
    this.showCustomersModal = true;
  }

  loadPolicyCustomers(policyProductId: string) {
    this.loading.customers = true;
    this.agentService.getPolicyCustomers(policyProductId).subscribe({
      next: (response) => {
        if (response.success) {
          this.policyCustomers = response.customers;
        }
        this.loading.customers = false;
      },
      error: (error) => {
        console.error('Error loading policy customers:', error);
        this.loading.customers = false;
      }
    });
  }

  closeCustomersModal() {
    this.showCustomersModal = false;
    this.selectedPolicy = null;
    this.policyCustomers = [];
  }

  viewCustomerPayments(customer: Customer) {
    this.selectedCustomer = customer;
    this.loadCustomerPayments(customer.userPolicyId);
    this.showPaymentHistoryModal = true;
  }

  loadCustomerPayments(userPolicyId: string) {
    this.loading.customerPayments = true;
    this.agentService.getCustomerPayments(userPolicyId).subscribe({
      next: (response) => {
        if (response.success) {
          this.customerPaymentHistory = response;
        }
        this.loading.customerPayments = false;
      },
      error: (error) => {
        console.error('Error loading customer payments:', error);
        this.loading.customerPayments = false;
      }
    });
  }

  closePaymentHistoryModal() {
    this.showPaymentHistoryModal = false;
    this.selectedCustomer = null;
    this.customerPaymentHistory = null;
  }

  viewClaim(claim: Claim) {
    this.selectedClaim = claim;
    this.showClaimModal = true;
  }

  closePolicyModal() {
    this.showPolicyModal = false;
    this.selectedPolicy = null;
  }

  closeClaimModal() {
    this.showClaimModal = false;
    this.selectedClaim = null;
    this.decisionNotes = '';
  }

  // Edit Claim flow
  openEditClaim(c: Claim) {
    this.editingClaim = c;
    this.claimForm = {
      incidentDate: this.formatDateForInput(c.incidentDate),
      amountClaimed: c.amountClaimed ?? null,
      description: c.description || '',
      decisionNotes: c.decisionNotes || ''
    };
    this.showEditClaimModal = true;
  }

  closeEditClaim() {
    this.showEditClaimModal = false;
    this.editingClaim = null;
  }

  saveClaimEdit() {
    if (!this.editingClaim) return;
    const payload: any = {};
    if (this.claimForm.incidentDate) payload.incidentDate = new Date(this.claimForm.incidentDate).toISOString();
    if (this.claimForm.amountClaimed != null) payload.amountClaimed = Number(this.claimForm.amountClaimed);
    if (this.claimForm.description != null) payload.description = this.claimForm.description;
    if (this.claimForm.decisionNotes != null) payload.decisionNotes = this.claimForm.decisionNotes;

    this.agentService.updateClaim(this.editingClaim.claimId, payload).subscribe({
      next: (res) => {
        if (res?.success) {
          // Update local list
          const updated = res.claim;
          const idx = this.claims.findIndex(cl => cl.claimId === this.editingClaim!.claimId);
          if (idx > -1) {
            this.claims[idx] = {
              ...this.claims[idx],
              incidentDate: updated.incidentDate || this.claims[idx].incidentDate,
              description: updated.description ?? this.claims[idx].description,
              amountClaimed: updated.amountClaimed ?? this.claims[idx].amountClaimed,
              decisionNotes: updated.decisionNotes ?? this.claims[idx].decisionNotes
            };
          }
          this.closeEditClaim();
          this.showSuccessMessage('Success!', 'Claim updated successfully.');
        }
      },
      error: (err) => {
        console.error('Failed to update claim', err);
        this.showErrorMessage('Error!', 'Failed to update claim.');
      }
    });
  }

  private formatDateForInput(date: string | Date | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Approved': 'bg-green-100 text-green-800',
      'Rejected': 'bg-red-100 text-red-800',
      'Cancelled': 'bg-gray-100 text-gray-800',
      'Expired': 'bg-gray-100 text-gray-800',
      'Claimed': 'bg-purple-100 text-purple-800'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  }

  hasPaymentHistory(): boolean {
    return !!(this.customerPaymentHistory?.payments && this.customerPaymentHistory.payments.length > 0);
  }

  viewCustomerDetails(customer: Customer) {
    this.selectedCustomerDetails = customer;
    this.showCustomerDetailsModal = true;
    // Data is already available in the customer object from the API
    console.log('Customer details:', customer);
  }

  loadCustomerDetailsData(customer: Customer) {
    // This method is no longer needed as all data comes from the API
    // But keeping it for potential future enhancements
    this.loading.customerDetails = false;
  }

  closeCustomerDetailsModal() {
    this.showCustomerDetailsModal = false;
    this.selectedCustomerDetails = null;
    this.loading.customerDetails = false;
  }

  loadPolicyRequests() {
    this.loading.policyRequests = true;
    this.agentService.getPolicyRequests().subscribe({
      next: (response) => {
        if (response.success) {
          this.policyRequests = response.requests;
        }
        this.loading.policyRequests = false;
      },
      error: (error) => {
        console.error('Error loading policy requests:', error);
        this.loading.policyRequests = false;
      }
    });
  }

  approvePolicyRequest(request: PolicyRequest) {
    // Store the request and show confirmation modal
    this.pendingActionRequest = request;
    this.showApproveConfirmModal = true;
  }

  confirmApprove() {
    if (!this.pendingActionRequest) return;
    
    // Set loading state
    this.loading.approvingPolicy = this.pendingActionRequest.userPolicyId;
    this.showApproveConfirmModal = false;
    
    this.agentService.approvePolicyRequest(this.pendingActionRequest.userPolicyId).subscribe({
      next: (response) => {
        // Clear loading state
        this.loading.approvingPolicy = null;
        
        if (response.success && this.pendingActionRequest) {
          // Update the request status locally to Approved (matches backend enum)
          this.pendingActionRequest.status = 'Approved';
          this.pendingActionRequest.verificationType = 'Agent';
          console.log('Policy request approved successfully');
          // Show success modal
          this.showSuccessMessage('Success!', 'Policy request approved successfully!');
          // Reload policy requests to get updated data
          this.loadPolicyRequests();
        }
        this.pendingActionRequest = null;
      },
      error: (error) => {
        // Clear loading state
        this.loading.approvingPolicy = null;
        console.error('Error approving policy request:', error);
        this.showErrorMessage('Error!', 'Error approving policy request. Please try again.');
        this.pendingActionRequest = null;
      }
    });
  }

  cancelApprove() {
    this.showApproveConfirmModal = false;
    this.pendingActionRequest = null;
  }

  rejectPolicyRequest(request: PolicyRequest) {
    // Store the request and show confirmation modal
    this.pendingActionRequest = request;
    this.showRejectConfirmModal = true;
  }

  confirmReject() {
    if (!this.pendingActionRequest) return;
    
    // Set loading state
    this.loading.rejectingPolicy = this.pendingActionRequest.userPolicyId;
    this.showRejectConfirmModal = false;
    
    this.agentService.rejectPolicyRequest(this.pendingActionRequest.userPolicyId).subscribe({
      next: (response) => {
        // Clear loading state
        this.loading.rejectingPolicy = null;
        
        if (response.success && this.pendingActionRequest) {
          // Update the request status locally
          this.pendingActionRequest.status = 'Rejected';
          this.pendingActionRequest.verificationType = 'Agent';
          console.log('Policy request rejected successfully');
          this.showSuccessMessage('Success!', 'Policy request rejected successfully!');
          // Reload policy requests to get updated data
          this.loadPolicyRequests();
        }
        this.pendingActionRequest = null;
      },
      error: (error) => {
        // Clear loading state
        this.loading.rejectingPolicy = null;
        console.error('Error rejecting policy request:', error);
        this.showErrorMessage('Error!', 'Error rejecting policy request. Please try again.');
        this.pendingActionRequest = null;
      }
    });
  }

  cancelReject() {
    this.showRejectConfirmModal = false;
    this.pendingActionRequest = null;
  }

  viewPolicyRequestDetails(request: PolicyRequest) {
    this.selectedPolicyRequest = request;
    this.showPolicyRequestDetailsModal = true;
    console.log('Policy Request Details:', request);
  }

  // Methods for Approved Customers tab
  viewApprovedCustomerDetails(customer: Customer) {
    this.selectedApprovedCustomer = customer;
    this.showApprovedCustomerDetailsModal = true;
    console.log('Customer Details:', customer);
  }

  viewCustomerPolicyHistory(customer: Customer) {
    this.selectedApprovedCustomer = customer;
    this.showPolicyHistoryModal = true;
    console.log('Customer Policy History:', customer);
  }

  logout() {
    // Clear session storage for tab state
    sessionStorage.removeItem('agentDashboard.activeTab');
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  // Modal helper methods
  showSuccessMessage(title: string, message: string) {
    this.modalTitle = title;
    this.modalMessage = message;
    this.showSuccessModal = true;
  }

  showErrorMessage(title: string, message: string) {
    this.modalTitle = title;
    this.modalMessage = message;
    this.showErrorModal = true;
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    this.modalTitle = '';
    this.modalMessage = '';
  }

  closeErrorModal() {
    this.showErrorModal = false;
    this.modalTitle = '';
    this.modalMessage = '';
  }

  closePolicyRequestDetailsModal() {
    this.showPolicyRequestDetailsModal = false;
    this.selectedPolicyRequest = null;
  }

  closeApprovedCustomerDetailsModal() {
    this.showApprovedCustomerDetailsModal = false;
    this.selectedApprovedCustomer = null;
  }

  closePolicyHistoryModal() {
    this.showPolicyHistoryModal = false;
    this.selectedApprovedCustomer = null;
  }
}
