// app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomePageContent } from './components/home-page-content/home-page-content';
import { PropertyListings } from './components/property-listings/property-listings';
import { PropertyDetails } from './components/property-details/property-details';
import { LoginSignup } from './components/login-signup/login-signup';
import { UserDashboard } from './components/user-dashboard/user-dashboard';
import { OwnerDashboard } from './components/owner-dashboard/owner-dashboard';
import { ownerGuard, userGuard } from './guards/role.guard';
import { OwnerPropertyDetailsForm } from './components/owner-property-details-form/owner-property-details-form';
import { OwnerPropertyImageUpload } from './components/owner-property-image-upload/owner-property-image-upload';

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

  { path: 'owner/property', redirectTo: 'owner/property/details', pathMatch: 'full' },
  { path: 'owner/property/details', component: OwnerPropertyDetailsForm },
  { path: 'owner/property/images', component: OwnerPropertyImageUpload },

  // Optional: A wildcard route for 404 pages
  // { path: '**', component: PageNotFoundComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
