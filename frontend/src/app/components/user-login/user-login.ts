import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { classifyConnectionIssue } from '../../utils/network-error';

@Component({
  selector: 'app-user-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HttpClientModule],
  templateUrl: './user-login.html'
})
export class UserLogin {
  private userApiUrl = `${environment.apiUrl}/users`;

  formData = {
    email: '',
    password: '',
    role: 'Customer',
    rememberMe: false
  };

  isLoading = false;
  errorMessage = '';
  errorSuggestion = '';
  errorBadge = '';
  successMessage = '';
  showLoginSuccess = false;
  showPassword = false;

  // Schema validation rules based on backend models
  validationRules = {
    email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    password: { min: 6, required: true }
  };

  constructor(private http: HttpClient, private router: Router) {}

  private getBackendConnectionMessage(): string {
    const backendOrigin = new URL(environment.apiUrl).origin;
    const frontendOrigin = typeof window !== 'undefined' ? window.location.origin : 'this app';
    return `Cannot reach the backend at ${backendOrigin}. Check that the server is running and allows requests from ${frontendOrigin}.`;
  }

  validateForm(): boolean {
    // Reset error message
    this.errorMessage = '';

    // Email validation
    if (!this.formData.email) {
      this.errorMessage = 'Email is required';
      return false;
    }
    if (!this.validationRules.email.pattern.test(this.formData.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return false;
    }

    // Password validation
    if (!this.formData.password) {
      this.errorMessage = 'Password is required';
      return false;
    }
    if (this.formData.password.length < this.validationRules.password.min) {
      this.errorMessage = 'Password must be at least 6 characters long';
      return false;
    }

    return true;
  }

  prepareLoginData() {
    return {
      email: this.formData.email.trim().toLowerCase(),
      password: this.formData.password,
      role: this.formData.role
    };
  }

  onSubmit() {
    // Reset messages
    this.errorMessage = '';
    this.errorSuggestion = '';
    this.errorBadge = '';
    this.successMessage = '';
    this.showLoginSuccess = false;

    // Validate form data
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    
    // Prepare login data
    const loginData = this.prepareLoginData();
    console.log('Login attempt with data:', { ...loginData, password: '[hidden]' });

    // Call backend API
    this.http.post(`${this.userApiUrl}/login`, loginData)
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;
          
          // Store token if provided
          if (response.token) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
          }
          
          // Navigate to respective dashboard based on role
          const role = (response.user?.role || this.formData.role || '').toLowerCase();
          if (role === 'admin') {
            this.router.navigate(['/admin-dashboard']);
          } else if (role === 'agent') {
            this.router.navigate(['/agent-dashboard']);
          } else {
            this.router.navigate(['/customer-dashboard']);
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.showLoginSuccess = false; // Hide success message if showing error
          this.errorBadge = '';
          
          // Handle specific error messages from backend
          if (error.error?.error) {
            this.errorMessage = error.error.error;
            this.errorSuggestion = error.error.suggestion || '';
          } else if (error.status === 404) {
            this.errorMessage = 'User account not found with this email address';
            this.errorSuggestion = 'Please check your email or register first';
          } else if (error.status === 401) {
            this.errorMessage = 'Invalid password entered';
            this.errorSuggestion = 'Please check your password and try again';
          } else if (error.status === 400) {
            this.errorMessage = error.error?.error || 'Invalid input provided';
            this.errorSuggestion = error.error?.suggestion || 'Please check your input and try again';
          } else if (error.status === 500) {
            this.errorMessage = 'Server temporarily unavailable';
            this.errorSuggestion = 'Please try again in a few moments';
          } else if (error.status === 0) {
            const issue = classifyConnectionIssue(environment.apiUrl);
            this.errorBadge = issue.label;
            this.errorMessage = 'Unable to connect to backend server';
            this.errorSuggestion = issue.message;
          } else {
            this.errorMessage = 'Login failed unexpectedly';
            this.errorSuggestion = 'Please try again or contact support';
          }
          
          console.error('Login error:', error);
        }
      });
  }

  // Reset form after successful login
  resetLoginForm(): void {
    this.formData = {
      email: '',
      password: '',
      role: 'Customer',
      rememberMe: false
    };
  }

  // Reset login state to show form again
  resetLoginState(): void {
    this.showLoginSuccess = false;
    this.successMessage = '';
    this.errorMessage = '';
    this.errorSuggestion = '';
    // Keep the stored token and user data for testing
    // Clear localStorage if you want to fully reset
    // localStorage.removeItem('token');
    // localStorage.removeItem('user');
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}
