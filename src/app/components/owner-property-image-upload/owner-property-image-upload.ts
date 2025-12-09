import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';

interface ImageUpload {
  file: File | null;
  previewUrl: string;
  fileName: string;
}

@Component({
  selector: 'app-owner-property-image-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './owner-property-image-upload.html',
  styleUrl: './owner-property-image-upload.css',
})

export class OwnerPropertyImageUpload {
  // Default placeholder images
  images: { [key: string]: ImageUpload } = {
    front: {
      file: null,
      previewUrl: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      fileName: 'No file chosen'
    },
    inside: {
      file: null,
      previewUrl: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      fileName: 'No file chosen'
    },
    anotherInside: {
      file: null,
      previewUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      fileName: 'No file chosen'
    },
    washroom: {
      file: null,
      previewUrl: 'https://images.unsplash.com/photo-1584622050111-993a426fbf0a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      fileName: 'No file chosen'
    }
  };

  constructor(private readonly router: Router, private readonly location: Location) {}

  onFileSelected(event: Event, imageKey: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Create preview URL
      const reader = new FileReader();
      reader.onload = () => {
        this.images[imageKey] = {
          file: file,
          previewUrl: reader.result as string,
          fileName: file.name
        };
      };
      reader.readAsDataURL(file);
    }
  }

  triggerFileInput(inputId: string): void {
    const fileInput = document.getElementById(inputId) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigate(['/owner-dashboard']).catch((err) => console.error('Navigation failed', err));
  }
}
