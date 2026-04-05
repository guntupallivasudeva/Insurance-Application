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
}