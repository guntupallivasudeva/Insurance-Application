import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-user-login',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HttpClientModule],
  templateUrl: './user-login.html'
})
export class UserLogin {
  formData = {
    email: '',
    password: '',
    role: 'Customer',
    rememberMe: false
  };

  isLoading = false;
  errorMessage = '';
  errorSuggestion = '';
  successMessage = '';
  showLoginSuccess = false;
  showPassword = false;

  // Schema validation rules based on backend models
  validationRules = {
    email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    password: { min: 6, required: true }
  };

  constructor(private http: HttpClient, private router: Router) {}

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
    this.http.post('http://localhost:8000/api/v1/users/login', loginData)
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;
          
          // Store token if provided
          if (response.token) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
          }
          
          // Show success message for testing (instead of navigation)
          this.successMessage = `Welcome back! Successfully logged in as ${response.user?.role || 'User'}.`;
          this.showLoginSuccess = true;
          console.log('Login successful:', response);
          
          // Reset form
          this.resetLoginForm();
          
          // TODO: Later change this to navigation
          // if (response.user?.role === 'Admin') {
          //   this.router.navigate(['/admin-dashboard']);
          // } else if (response.user?.role === 'Agent') {
          //   this.router.navigate(['/agent-dashboard']);
          // } else {
          //   this.router.navigate(['/customer-dashboard']);
          // }
        },
        error: (error) => {
          this.isLoading = false;
          this.showLoginSuccess = false; // Hide success message if showing error
          
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
            this.errorMessage = 'Unable to connect to server';
            this.errorSuggestion = 'Please check your internet connection';
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
