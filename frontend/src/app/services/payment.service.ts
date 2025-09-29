import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  constructor() { }

  /**
   * Compute payment status (Paid / Delayed / Pending / Failed)
   * @param payment The payment object
   * @returns Payment status string
   */
  computePaymentStatus(payment: any): string {
    try {
      if (!payment) return 'Pending';
      
      const status = (payment.status || '').toString().trim().toLowerCase();
      if (status === 'failed') return 'Failed';
      
      const paidAt = this.computePaidDate(payment);
      const isDone = status === 'done' || status === 'paid' || !!paidAt;
      
      // If payment is made, it should always show as "Paid" regardless of timing
      if (paidAt || isDone) {
        return 'Paid';
      }
      
      // For unpaid payments, check if past due
      const dueAt = this.computeDueDate(payment);
      if (dueAt && dueAt.getTime() < Date.now()) {
        return 'Delayed';
      }
      
      // Default to "Pending" for future payments
      return 'Pending';
    } catch {
      return 'Pending';
    }
  }

  /**
   * Get CSS classes for payment status badges
   * @param status The payment status
   * @returns Object with CSS classes for styling
   */
  getPaymentStatusClasses(status: string): { [key: string]: boolean } {
    return {
      'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200': status === 'Paid',
      'bg-amber-50 text-amber-700 ring-1 ring-amber-200': status === 'Delayed' || status === 'Pending',
      'bg-rose-50 text-rose-700 ring-1 ring-rose-200': status === 'Failed'
    };
  }

  /**
   * Compute paid date from payment object
   * @param payment The payment object
   * @returns Date when payment was made or null
   */
  computePaidDate(payment: any): Date | null {
    const date = payment?.datePaid || payment?.createdAt || payment?.updatedAt;
    const dateTime = date ? new Date(date) : null;
    return dateTime && !isNaN(dateTime.getTime()) ? dateTime : null;
  }

  /**
   * Compute due date for payment (requires policy context)
   * @param payment The payment object
   * @param policy The related policy object
   * @param paymentIndex The payment index (0-based)
   * @returns Due date or null
   */
  computeDueDate(payment: any, policy?: any, paymentIndex?: number): Date | null {
    // This is a simplified version - in real implementation, you'd need policy start date and payment index
    // For now, we'll use the payment's expected due date if available
    if (payment?.dueDate) {
      const date = new Date(payment.dueDate);
      return !isNaN(date.getTime()) ? date : null;
    }
    
    // If policy and payment index provided, calculate due date
    if (policy?.startDate && typeof paymentIndex === 'number') {
      const startDate = new Date(policy.startDate);
      if (!isNaN(startDate.getTime())) {
        return this.addMonths(startDate, paymentIndex);
      }
    }
    
    return null;
  }

  /**
   * Add months to a date
   * @param date Base date
   * @param months Number of months to add
   * @returns New date
   */
  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  /**
   * Check if payment is overdue
   * @param payment The payment object
   * @param policy The related policy object (optional)
   * @param paymentIndex The payment index (optional)
   * @returns boolean indicating if payment is overdue
   */
  isPaymentOverdue(payment: any, policy?: any, paymentIndex?: number): boolean {
    const status = this.computePaymentStatus(payment);
    return status === 'Delayed';
  }

  /**
   * Get payment method display text
   * @param payment The payment object
   * @returns Formatted payment method
   */
  getPaymentMethodDisplay(payment: any): string {
    return payment?.method || payment?.paymentMethod || 'Simulated';
  }

  /**
   * Format payment amount
   * @param amount The amount to format
   * @returns Formatted amount string
   */
  formatAmount(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(num) ? '0' : num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}