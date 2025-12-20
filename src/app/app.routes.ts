// app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePageContent } from './components/home-page-content/home-page-content';
import { PropertyListings } from './components/property-listings/property-listings';
import { PropertyDetails } from './components/property-details/property-details';
import { LoginSignup } from './components/login-signup/login-signup';
import { UserDashboard } from './components/user-dashboard/user-dashboard';
import { OwnerDashboard } from './components/owner-dashboard/owner-dashboard';
import { AdminDashboard } from './components/admin-dashboard/admin-dashboard';
import { AgentDashboard } from './components/agent-dashboard/agent-dashboard';
import { ownerGuard, userGuard, agentGuard, adminGuard } from './guards/role.guard';
import { OwnerHourlyRoomDetailsForm } from './components/owner-hourly-room-details-form/owner-hourly-room-details-form';
import { OwnerPropertyImageUpload } from './components/owner-property-image-upload/owner-property-image-upload';
import { OwnerFlatDetailsForm } from './components/owner-flat-details-form/owner-flat-details-form';
import { OwnerPgDetailsForm } from './components/owner-pg-details-form/owner-pg-details-form';
import { OwnerRoomDetailsForm } from './components/owner-room-details-form/owner-room-details-form';

export const routes: Routes = [
  // Add a default route (e.g., redirect to '/home' if the path is empty)
  { path: '', redirectTo: '/home', pathMatch: 'full' },

  // When the user visits '/home', show the home page component
  { path: 'home', component: HomePageContent },

  // When the user visits '/listings', show the property listings component
  { path: 'listings', component: PropertyListings },

  // When the user visits '/property/:id', show the property details component
  { path: 'property/:id', component: PropertyDetails },

  // Login / Signup page
  { path: 'login', component: LoginSignup },

  // User dashboard
  { path: 'dashboard', component: UserDashboard, canActivate: [userGuard] },

  // Owner dashboard
  { path: 'owner-dashboard', component: OwnerDashboard, canActivate: [ownerGuard] },

  { path: 'agent-dashboard', component: AgentDashboard, canActivate: [agentGuard] },

  { path: 'admin-dashboard', component: AdminDashboard, canActivate: [adminGuard] },

  // Hourly Room property routes
  { path: 'owner/hourly-room', redirectTo: 'owner/hourly-room/details', pathMatch: 'full' },
  { path: 'owner/hourly-room/details', component: OwnerHourlyRoomDetailsForm, canActivate: [ownerGuard] },
  { path: 'owner/hourly-room/images', component: OwnerPropertyImageUpload, canActivate: [ownerGuard] },

  // Flat property routes
  { path: 'owner/flat', redirectTo: 'owner/flat/details', pathMatch: 'full' },
  { path: 'owner/flat/details', component: OwnerFlatDetailsForm, canActivate: [ownerGuard] },
  { path: 'owner/flat/images', component: OwnerPropertyImageUpload, canActivate: [ownerGuard] },

  // PG property routes
  { path: 'owner/pg', redirectTo: 'owner/pg/details', pathMatch: 'full' },
  { path: 'owner/pg/details', component: OwnerPgDetailsForm, canActivate: [ownerGuard] },
  { path: 'owner/pg/images', component: OwnerPropertyImageUpload, canActivate: [ownerGuard] },

  // Room property routes
  { path: 'owner/room', redirectTo: 'owner/room/details', pathMatch: 'full' },
  { path: 'owner/room/details', component: OwnerRoomDetailsForm, canActivate: [ownerGuard] },
  { path: 'owner/room/images', component: OwnerPropertyImageUpload, canActivate: [ownerGuard] },

  // Optional: A wildcard route for 404 pages
  // { path: '**', component: PageNotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
