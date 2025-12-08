import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-owner-property-image-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './owner-property-image-upload.html',
  styleUrl: './owner-property-image-upload.css',
})

export class OwnerPropertyImageUpload {
  constructor(private readonly router: Router) {}

  onBack(): void {
    this.router.navigate(['/owner/property/details']).catch((err) => console.error('Navigation failed', err));
  }
}
