import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class VerificationService {

  constructor() { }

  /**
   * Get CSS classes for verification type badges
   * @param verificationType The verification type (Agent, Admin, None, etc.)
   * @returns Object with CSS classes for styling
   */
  getVerificationTypeClasses(verificationType: string | null | undefined): { [key: string]: boolean } {
    const type = verificationType?.toLowerCase() || 'none';
    
    return {
      'bg-blue-100 text-blue-800': type === 'agent',
      'bg-purple-100 text-purple-800': type === 'admin',
      'bg-gray-100 text-gray-800': type === 'none' || !verificationType
    };
  }

  /**
   * Get the display text for verification type
   * @param verificationType The verification type
   * @returns Formatted display text
   */
  getVerificationTypeDisplay(verificationType: string | null | undefined): string {
    return verificationType || 'None';
  }

  /**
   * Check if verification type is valid
   * @param verificationType The verification type to check
   * @returns boolean indicating if the type is valid
   */
  isValidVerificationType(verificationType: string | null | undefined): boolean {
    const validTypes = ['agent', 'admin'];
    return validTypes.includes((verificationType || '').toLowerCase());
  }

  /**
   * Get verification type color for status indication
   * @param verificationType The verification type
   * @returns Color class for the verification type
   */
  getVerificationTypeColor(verificationType: string | null | undefined): string {
    const type = verificationType?.toLowerCase() || 'none';
    
    switch (type) {
      case 'agent':
        return 'text-blue-600';
      case 'admin':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  }

  /**
   * Get verification type background color
   * @param verificationType The verification type
   * @returns Background color class
   */
  getVerificationTypeBackground(verificationType: string | null | undefined): string {
    const type = verificationType?.toLowerCase() || 'none';
    
    switch (type) {
      case 'agent':
        return 'bg-blue-50';
      case 'admin':
        return 'bg-purple-50';
      default:
        return 'bg-gray-50';
    }
  }
}