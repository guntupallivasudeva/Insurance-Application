import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-user-signup',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HttpClientModule],
  templateUrl: './user-signup.html'
})
export class UserSignup {
  formData = {
    name: '',
    email: '',
    password: '',
    role: 'Customer',
    branch: '' // Only for Agents
  };

  isLoading = false;
  errorMessage = '';
  errorSuggestion = '';
  successMessage = '';
  showCongratulations = false;
  showPassword = false;

  // Schema validation rules based on backend models
  validationRules = {
    name: { min: 3, max: 30, required: true },
    email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    password: { min: 6, required: true },
    branch: { required: false, onlyForAgent: true }
  };

  constructor(private http: HttpClient, private router: Router) {}

  onSubmit() {
    // Reset messages
    this.errorMessage = '';
    this.errorSuggestion = '';
    this.successMessage = '';

    // Enhanced validation based on backend schema
    const validation = this.validateForm();
    if (!validation.isValid) {
      this.errorMessage = validation.error || 'Validation failed';
      this.showCongratulations = false; // Hide success message if showing error
      return;
    }

    this.isLoading = true;
    
    // Prepare data according to backend model requirements
    const registrationData = this.prepareRegistrationData();

    // Debug: Log the data being sent to backend
    console.log('Sending registration data to backend:', registrationData);

    // Call backend API
    this.http.post('http://localhost:8000/api/v1/users/register', registrationData)
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;
          this.successMessage = `Congratulations! Your ${this.formData.role} account has been created successfully.`;
          this.showCongratulations = true;
          console.log('Registration successful:', response);
          
          // Reset form
          this.resetForm();
          
          // Redirect to login page after showing success message
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 4000);
        },
        error: (error) => {
          this.isLoading = false;
          this.showCongratulations = false; // Hide success message if showing error
          
          // Handle specific error messages from backend
          if (error.error?.error) {
            this.errorMessage = error.error.error;
            this.errorSuggestion = error.error.suggestion || '';
          } else if (error.status === 409) {
            this.errorMessage = 'An account with this email already exists';
            this.errorSuggestion = 'Please use a different email or try logging in';
          } else if (error.status === 400) {
            this.errorMessage = error.error?.error || 'Invalid information provided';
            this.errorSuggestion = error.error?.suggestion || 'Please check your input and try again';
          } else if (error.status === 500) {
            this.errorMessage = 'Server temporarily unavailable';
            this.errorSuggestion = 'Please try again in a few moments';
          } else if (error.status === 0) {
            this.errorMessage = 'Unable to connect to server';
            this.errorSuggestion = 'Please check your internet connection';
          } else {
            this.errorMessage = 'Registration failed unexpectedly';
            this.errorSuggestion = 'Please try again or contact support';
          }
          
          console.error('Registration error details:', error);
          console.error('Error response:', error.error);
        }
      });
  }

  // Method to show/hide agent-specific fields
  isAgentRole(): boolean {
    return this.formData.role === 'Agent';
  }

  // Reset form after successful registration
  resetForm(): void {
    this.formData = {
      name: '',
      email: '',
      password: '',
      role: 'Customer',
      branch: ''
    };
  }

  // Comprehensive form validation based on backend schema
  validateForm(): { isValid: boolean; error?: string } {
    // Name validation (required, 3-30 characters, trimmed)
    const name = this.formData.name.trim();
    if (!name) {
      return { isValid: false, error: 'Name is required' };
    }
    if (name.length < this.validationRules.name.min || name.length > this.validationRules.name.max) {
      return { isValid: false, error: `Name must be between ${this.validationRules.name.min} and ${this.validationRules.name.max} characters` };
    }

    // Email validation (required, valid format, will be lowercase in backend)
    if (!this.formData.email) {
      return { isValid: false, error: 'Email is required' };
    }
    if (!this.validationRules.email.pattern.test(this.formData.email)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }

    // Password validation (required, minimum 6 characters)
    if (!this.formData.password) {
      return { isValid: false, error: 'Password is required' };
    }
    if (this.formData.password.length < this.validationRules.password.min) {
      return { isValid: false, error: `Password must be at least ${this.validationRules.password.min} characters long` };
    }

    return { isValid: true };
  }

  // Prepare data according to backend model requirements
  prepareRegistrationData(): any {
    const data: any = {
      name: this.formData.name.trim(), // Trim whitespace as per backend schema
      email: this.formData.email.toLowerCase(), // Lowercase as per backend schema
      password: this.formData.password,
      role: this.formData.role
    };

    // Branch field only for Agents (as per Agent model)
    if (this.formData.role === 'Agent' && this.formData.branch) {
      data.branch = this.formData.branch;
    }

    return data;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}
