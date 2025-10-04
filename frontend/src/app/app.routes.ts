import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { UserSignup } from './components/user-signup/user-signup';
import { UserLogin } from './components/user-login/user-login';
import { AdminLogin } from './components/admin-login/admin-login';
import { AdminDashboard } from './components/admin-dashboard/admin-dashboard';
import { AgentDashboard } from './components/agent-dashboard/agent-dashboard';
import { CustomerDashboard } from './components/customer-dashboard/customer-dashboard';
import { adminGuard, agentGuard, customerGuard, roleRedirectGuard } from './guards/auth.guards';

export const routes: Routes = [
  { path: '', canActivate: [roleRedirectGuard], component: Home },
  { path: 'home', component: Home },
  { path: 'register', component: UserSignup },
  { path: 'login', component: UserLogin },
  { path: 'admin-login', component: AdminLogin },
  { path: 'admin-dashboard', component: AdminDashboard, canActivate: [adminGuard] },
  { path: 'admin-dashboard/pending-policies', component: AdminDashboard, canActivate: [adminGuard] },
  { path: 'admin-dashboard/approved-policies', component: AdminDashboard, canActivate: [adminGuard] },
  { path: 'admin-dashboard/agents', component: AdminDashboard, canActivate: [adminGuard] },
  { path: 'admin-dashboard/policies', component: AdminDashboard, canActivate: [adminGuard] },
  { path: 'admin-dashboard/user-policies', component: AdminDashboard, canActivate: [adminGuard] },
  { path: 'admin-dashboard/customers', component: AdminDashboard, canActivate: [adminGuard] },
  { path: 'admin-dashboard/claims', component: AdminDashboard, canActivate: [adminGuard] },
  { path: 'agent-dashboard', component: AgentDashboard, canActivate: [agentGuard] },
  { path: 'customer-dashboard', component: CustomerDashboard, canActivate: [customerGuard] },
  { path: '**', redirectTo: '/home' }
];
