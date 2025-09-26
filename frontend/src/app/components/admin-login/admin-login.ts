import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminLoginRequest } from '../../services/admin.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-login.html'
})
export class AdminLogin {
  constructor(private adminService: AdminService) {}
  formData = {
    email: '',
    password: ''
  };

  isLoading = false;
  successMessage = '';
  errorMessage = '';
  showPassword = false;

  onSubmit() {
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';
    
    // Basic validation
    if (!this.formData.email || !this.formData.password) {
      this.errorMessage = 'Please fill in all required fields.';
      this.isLoading = false;
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.formData.email)) {
      this.errorMessage = 'Please enter a valid email address.';
      this.isLoading = false;
      return;
    }
    
    // Prepare login request with Admin role
    const loginRequest: AdminLoginRequest = {
      email: this.formData.email,
      password: this.formData.password,
      role: 'Admin'
    };

    console.log('Admin login request:', loginRequest);

    // Make API call to backend using existing user login endpoint
    this.adminService.login(loginRequest).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Admin login response:', response);
        
        if (response.success) {
          // Login successful
          this.successMessage = response.message || 'Login successful! Welcome to Admin Portal.';
          
          // Store token and admin data
          this.adminService.setToken(response.token);
          this.adminService.setAdminData(response.user);
          
          console.log('Admin logged in successfully:', response.user);
          
          // Test admin authentication by calling a protected endpoint
          this.adminService.testAdminAuth().subscribe({
            next: (authTestResponse) => {
              console.log('Admin authentication test successful:', authTestResponse);
              
              // Navigate to admin dashboard after successful auth test
              setTimeout(() => {
                // TODO: Implement navigation to admin dashboard
                console.log('Redirect to admin dashboard');
                console.log('Stored admin data:', this.adminService.getAdminData());
                console.log('Admin token working with backend middleware');
              }, 1500);
            },
            error: (authError) => {
              console.error('Admin authentication test failed:', authError);
              this.errorMessage = 'Authentication successful but admin access denied. Please contact administrator.';
              // Clear stored data if auth test fails
              this.adminService.logout();
            }
          });
        } else {
          // Handle error response
          this.errorMessage = (response as any).error || 'Login failed. Please try again.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Admin login error:', error);
        
        // Handle different error scenarios based on backend response structure
        if (error.status === 404) {
          this.errorMessage = error.error?.error || 'No Admin account found with this email address.';
        } else if (error.status === 401) {
          this.errorMessage = error.error?.error || 'Invalid password. Please check your password and try again.';
        } else if (error.status === 400) {
          const errorMsg = error.error?.error;
          if (errorMsg && errorMsg.includes('wrong role')) {
            this.errorMessage = 'This email is not registered as an Admin account.';
          } else {
            this.errorMessage = errorMsg || 'Please check your input and try again.';
          }
        } else if (error.status === 0) {
          this.errorMessage = 'Unable to connect to server. Please check your connection and ensure the backend is running.';
        } else {
          this.errorMessage = 'Server error. Please try again later.';
        }
      }
    });
  }

  clearMessages() {
    this.successMessage = '';
    this.errorMessage = '';
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}
