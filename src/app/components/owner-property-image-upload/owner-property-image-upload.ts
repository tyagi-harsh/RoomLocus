import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

interface ImageUpload {
  file: File | null;
  previewUrl: string;
  fileName: string;
}

const DEFAULT_IMAGE_SRC = 'assets/images/icons/image_add_photo2.jpg';
const DEFAULT_FILE_NAME = 'image.png';

@Component({
  selector: 'app-owner-property-image-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './owner-property-image-upload.html',
  styleUrl: './owner-property-image-upload.css',
})

export class OwnerPropertyImageUpload implements OnInit {
  // Default placeholder images
  images: { [key: string]: ImageUpload } = {
    front: {
      file: null,
      previewUrl: DEFAULT_IMAGE_SRC,
      fileName: DEFAULT_FILE_NAME
    },
    inside: {
      file: null,
      previewUrl: DEFAULT_IMAGE_SRC,
      fileName: DEFAULT_FILE_NAME
    },
    anotherInside: {
      file: null,
      previewUrl: DEFAULT_IMAGE_SRC,
      fileName: DEFAULT_FILE_NAME
    },
    lobby: {
      file: null,
      previewUrl: DEFAULT_IMAGE_SRC,
      fileName: DEFAULT_FILE_NAME
    },
    kitchen: {
      file: null,
      previewUrl: DEFAULT_IMAGE_SRC,
      fileName: DEFAULT_FILE_NAME
    },
    toilet: {
      file: null,
      previewUrl: DEFAULT_IMAGE_SRC,
      fileName: DEFAULT_FILE_NAME
    },
    other: {
      file: null,
      previewUrl: DEFAULT_IMAGE_SRC,
      fileName: DEFAULT_FILE_NAME
    },
    washroom: {
      file: null,
      previewUrl: DEFAULT_IMAGE_SRC,
      fileName: DEFAULT_FILE_NAME
    }
  };
  readonly imageSections = [
    { key: 'front', label: 'Front' },
    { key: 'lobby', label: 'Lobby' },
    { key: 'inside', label: 'Inside' },
    { key: 'anotherInside', label: 'Another Inside View' },
    { key: 'kitchen', label: 'Kitchen' },
    { key: 'washroom', label: 'Washroom' },
    { key: 'toilet', label: 'Toilet' },
    { key: 'other', label: 'Other' },
  ];
  headingText = 'Upload Images';

  constructor(
    private readonly router: Router,
    private readonly location: Location,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.setupHeading();
  }

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

  onUpload(): void {
    console.log('Upload Images clicked. Implement upload logic here.');
  }

  private setupHeading(): void {
    const propertyType = this.route.snapshot.queryParamMap.get('propertyType')?.toLowerCase();
    const labelMap: Record<string, string> = {
      flat: 'Upload Flat Images',
      pg: 'Upload PG Images',
      room: 'Upload Room Images',
      'hourly-room': 'Upload Hourly Room Images',
    };
    this.headingText = labelMap[propertyType ?? ''] ?? 'Upload Images';
  }
}
