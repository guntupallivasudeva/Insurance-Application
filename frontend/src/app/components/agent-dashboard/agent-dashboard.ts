import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AgentService, DashboardStats, Policy, Claim, Payment, Customer, CustomerPaymentHistory, PolicyRequest, PaymentCustomer } from '../../services/agent.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-agent-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './agent-dashboard.html',
  styleUrls: ['./agent-dashboard.css']
})
export class AgentDashboard implements OnInit {
  roleTitle = 'Agent';
  userName = 'User';
  activeTab = 'policies';
  
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
  showSuccessModal = false;
  showErrorModal = false;
  selectedPolicy: Policy | null = null;
  selectedClaim: Claim | null = null;
  selectedCustomer: Customer | null = null;
  selectedCustomerDetails: Customer | null = null;
  selectedPolicyRequest: PolicyRequest | null = null;
  selectedApprovedCustomer: Customer | null = null;
  decisionNotes = '';
  modalTitle = '';
  modalMessage = '';
  modalDetails = '';

  constructor(
    private auth: AuthService, 
    private router: Router,
    private agentService: AgentService
  ) {
    const role = (this.auth.getRole() || 'Agent').toString();
    this.roleTitle = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    const user = this.auth.getUser();
    this.userName = user?.name || user?.email || 'User';
  }

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loadDashboardStats();
    this.loadPolicies();
    this.loadClaims();
    this.loadPolicyRequests();
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    
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
    // Confirm with the user before approving
    if (!confirm('Are you sure you want to approve this policy request?')) {
      return;
    }
    
    // Set loading state
    this.loading.approvingPolicy = request.userPolicyId;
    
    this.agentService.approvePolicyRequest(request.userPolicyId).subscribe({
      next: (response) => {
        // Clear loading state
        this.loading.approvingPolicy = null;
        
        if (response.success) {
          // Update the request status locally to Approved (matches backend enum)
          request.status = 'Approved';
          console.log('Policy request approved successfully');
          // Show success modal
          this.showSuccessMessage('Success!', 'Policy request approved successfully!');
        }
      },
      error: (error) => {
        // Clear loading state
        this.loading.approvingPolicy = null;
        console.error('Error approving policy request:', error);
        this.showErrorMessage('Error!', 'Error approving policy request. Please try again.');
      }
    });
  }

  rejectPolicyRequest(request: PolicyRequest) {
    // Confirm with the user before rejecting
    if (!confirm('Are you sure you want to reject this policy request?')) {
      return;
    }
    
    // Set loading state
    this.loading.rejectingPolicy = request.userPolicyId;
    
    this.agentService.rejectPolicyRequest(request.userPolicyId).subscribe({
      next: (response) => {
        // Clear loading state
        this.loading.rejectingPolicy = null;
        
        if (response.success) {
          // Update the request status locally
          request.status = 'Rejected';
          console.log('Policy request rejected successfully');
            this.showSuccessMessage('Success!', 'Policy request rejected successfully!');
        }
      },
      error: (error) => {
        // Clear loading state
        this.loading.rejectingPolicy = null;
        console.error('Error rejecting policy request:', error);
          this.showErrorMessage('Error!', 'Error rejecting policy request. Please try again.');
      }
    });
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
