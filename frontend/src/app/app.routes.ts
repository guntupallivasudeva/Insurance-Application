import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { UserSignup } from './components/user-signup/user-signup';
import { UserLogin } from './components/user-login/user-login';
import { AdminLogin } from './components/admin-login/admin-login';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: Home },
  { path: 'register', component: UserSignup },
  { path: 'login', component: UserLogin },
  { path: 'admin-login', component: AdminLogin },
  { path: '**', redirectTo: '/home' }
];
