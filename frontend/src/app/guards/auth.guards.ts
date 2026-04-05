import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigate(['/login']);
  return false;
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn() && auth.getRole()?.toLowerCase() === 'admin') return true;
  router.navigate(['/login']);
  return false;
};

export const agentGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn() && auth.getRole()?.toLowerCase() === 'agent') return true;
  router.navigate(['/login']);
  return false;
};

export const customerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn() && auth.getRole()?.toLowerCase() === 'customer') return true;
  router.navigate(['/login']);
  return false;
};

// Redirect root to role-specific dashboard or to home if not logged in
export const roleRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const role = auth.getRole()?.toLowerCase();
  if (auth.isLoggedIn()) {
    if (role === 'admin') return router.createUrlTree(['/admin-dashboard']);
    if (role === 'agent') return router.createUrlTree(['/agent-dashboard']);
    if (role === 'customer') return router.createUrlTree(['/customer-dashboard']);
    return router.createUrlTree(['/login']);
  }
  return router.createUrlTree(['/home']);
};
