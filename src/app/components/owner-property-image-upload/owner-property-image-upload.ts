import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { PropertyCreationService, ApiResult, FlatPayload, RoomPayload, PGPayload, HourlyRoomPayload } from '../../services/property-creation.service';
import { ToastService } from '../../services/toast.service';
import { OwnerPropertyStoreService } from '../../services/owner-property-store.service';
import { PropertyCreationDraftService, PropertyTypeKey } from '../../services/property-creation-draft.service';
import { DEFAULT_PROPERTY_GALLERY } from '../../constants/property-images';

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
  propertyTypeKey: PropertyTypeKey = 'flat';
  isSaving = false;

  constructor(
    private readonly router: Router,
    private readonly location: Location,
    private readonly route: ActivatedRoute,
    private readonly propertyCreationService: PropertyCreationService,
    private readonly creationDraftService: PropertyCreationDraftService,
    private readonly toastService: ToastService,
    private readonly ownerPropertyStore: OwnerPropertyStoreService
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
    const draft = this.creationDraftService.getDraft();
    if (!draft) {
      this.toastService.error('Please complete the details form before uploading images.');
      return;
    }

    this.propertyTypeKey = draft.propertyType;
    this.headingText = this.getHeadingForType(this.propertyTypeKey);

    if (!this.hasSelectedImages()) {
      this.applyDefaultGalleryImages();
    }

    const ownerId = draft.ownerId;
    const createObservable = this.buildCreateObservable(this.propertyTypeKey, ownerId, draft.payload);
    if (!createObservable) {
      this.toastService.error('Unsupported property type. Please try again.');
      return;
    }

    this.isSaving = true;
    createObservable.pipe(take(1)).subscribe({
      next: (result) => {
        this.isSaving = false;
        if (result.success) {
          this.toastService.success(`${this.getPropertyTypeLabel(this.propertyTypeKey)} listing created successfully!`);
          this.recordPropertySummary(ownerId, result.data?.id, this.propertyTypeKey, draft.payload);
          this.creationDraftService.clearDraft();
          this.router
            .navigate(['/owner-dashboard'])
            .catch((err) => console.error('Navigation failed', err));
        } else {
          this.toastService.error(result.error || 'Failed to create listing. Please try again.');
        }
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Property creation error:', err);
        this.toastService.error('Failed to create listing. Please try again.');
      },
    });
  }

  private setupHeading(): void {
    const propertyTypeParam = this.route.snapshot.queryParamMap.get('propertyType');
    this.propertyTypeKey = this.normalizePropertyType(propertyTypeParam);
    this.headingText = this.getHeadingForType(this.propertyTypeKey);
  }

  private normalizePropertyType(value: string | null): PropertyTypeKey {
    const normalized = (value ?? '').toLowerCase();
    if (normalized === 'room') {
      return 'room';
    }
    if (normalized === 'pg') {
      return 'pg';
    }
    if (normalized === 'hourly-room') {
      return 'hourly-room';
    }
    return 'flat';
  }

  private getHeadingForType(type: PropertyTypeKey): string {
    switch (type) {
      case 'flat':
        return 'Upload Flat Images';
      case 'pg':
        return 'Upload PG Images';
      case 'room':
        return 'Upload Room Images';
      case 'hourly-room':
        return 'Upload Hourly Room Images';
    }
  }

  private getPropertyTypeLabel(type: PropertyTypeKey): string {
    switch (type) {
      case 'flat':
        return 'Flat';
      case 'pg':
        return 'PG';
      case 'room':
        return 'Room';
      case 'hourly-room':
        return 'Hourly Room';
    }
  }

  private hasSelectedImages(): boolean {
    return Object.values(this.images).some((entry) => Boolean(entry.file));
  }

  private applyDefaultGalleryImages(): void {
    this.imageSections.forEach((section, index) => {
      const previewUrl = DEFAULT_PROPERTY_GALLERY[index % DEFAULT_PROPERTY_GALLERY.length];
      this.images[section.key] = {
        file: null,
        previewUrl,
        fileName: DEFAULT_FILE_NAME,
      };
    });
  }

  private buildCreateObservable(type: PropertyTypeKey, ownerId: number, payload: FlatPayload | RoomPayload | PGPayload | HourlyRoomPayload): Observable<ApiResult<any>> | null {
    switch (type) {
      case 'flat':
        return this.propertyCreationService.createFlat(ownerId, payload as FlatPayload);
      case 'room':
        return this.propertyCreationService.createRoom(ownerId, payload as RoomPayload);
      case 'pg':
        return this.propertyCreationService.createPG(ownerId, payload as PGPayload);
      case 'hourly-room':
        return this.propertyCreationService.createHourlyRoom(ownerId, payload as HourlyRoomPayload);
      default:
        return null;
    }
  }

  private recordPropertySummary(
    ownerId: number,
    propertyId: number | undefined,
    propertyType: PropertyTypeKey,
    payload: FlatPayload | RoomPayload | PGPayload | HourlyRoomPayload
  ): void {
    if (!propertyId) {
      return;
    }
    const townSector = payload.townSector || '';
    const location = payload.location || '';
    const city = payload.city || '';
    const locationLabel = [townSector, location].filter(Boolean).join(', ') || 'Location not set';
    const displayNameSegments = [this.getPropertyTypeLabel(propertyType), city, townSector, location].filter(Boolean);
    this.ownerPropertyStore.addProperty(ownerId, {
      propertyId,
      propertyType: this.getPropertyTypeLabel(propertyType),
      displayName: displayNameSegments.length ? displayNameSegments.join(' · ') : this.getPropertyTypeLabel(propertyType),
      location: locationLabel,
      townSector: townSector || undefined,
      createdAt: Date.now(),
    });
  }
}
