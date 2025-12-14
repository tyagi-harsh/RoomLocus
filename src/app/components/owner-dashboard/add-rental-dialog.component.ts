import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';

export type RentalType = 'flat' | 'room' | 'pg' | 'hourly-room';

@Component({
  selector: 'app-add-rental-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="add-rental-dialog">
      <h2 class="dialog-title">Add Rental</h2>
      <div class="rental-options">
        <button class="rental-option" (click)="selectType('flat')">FLAT</button>
        <button class="rental-option" (click)="selectType('room')">ROOM</button>
        <button class="rental-option" (click)="selectType('pg')">PG</button>
        <button class="rental-option" (click)="selectType('hourly-room')">HOURLY ROOM</button>
      </div>
      <div class="dialog-actions">
        <button class="btn-close" (click)="close()">Close</button>
      </div>
    </div>
  `,
  styles: [`
    .add-rental-dialog {
      padding: 1.5rem;
      text-align: center;
      min-width: 180px;
        max-width: 400px;
       
      
      
    }
    .dialog-title {
      margin: 0 0 1rem;
      font-size: 1.4rem;
      font-weight: 500;
      color: #1e3a5f;
    }
    .rental-options {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      margin-bottom: 0.8rem;
    }
    .rental-option {
      padding: 0.875rem 1.5rem;
      font-size: 1rem;
      font-weight: 500;
      border: none;
      /* border: 2px solid #0ea5e9; */
      background: #fff;
      color: #00b1b1;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .rental-option:hover {
      background: #00b1b1;
      color: #fff;
    }
    .dialog-actions {
      display: flex;
      justify-content: center;
    }
    .btn-close {
      padding: 0.625rem 2rem;
      font-size: 0.95rem;
      background: gray;
      color: white;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .btn-close:hover {
      background: lightgray;
    }
  `]
})
export class AddRentalDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<AddRentalDialogComponent>,
    private readonly dialog: MatDialog,
    private readonly router: Router
  ) {}

  selectType(type: RentalType): void {
    this.dialogRef.close();
    this.dialog.open(RentalNoteDialogComponent, {
      data: { rentalType: type },
      disableClose: true
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}

@Component({
  selector: 'app-rental-note-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="note-dialog">
      <h2 class="dialog-title">Note</h2>
      <p class="note-text">
        If the owner posts property details or photos illegally or incorrectly on the website, 
        the Roomlocus team can block your ID and may also take legal action against you. 
        The owner will be fully responsible for any illegal or incorrect posting of property 
        details or photos on the website.
      </p>
      <div class="dialog-actions">
        <button class="btn-agree" (click)="agree()">Agree</button>
      </div>
    </div>
  `,
  styles: [`
    .note-dialog {
      padding: 1.5rem;
      min-width: 170px;
     max-width:270px;
    }
    .dialog-title {
      margin: 0 0 1rem;
      font-size: 1.4rem;
      font-weight: 500;
      color: #1e3a5f;
      text-align: center;
    }
    .note-text {
      font-size: 0.95rem;
      line-height: 1.6;
      color: #374151;
      margin-bottom: 1.5rem;
      text-align: justify;
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
    }
    .btn-agree {
      padding: 0.625rem 1.2rem;
      font-size: 1rem;
      font-weight: 500;
      background: #01b1b1;
      color: #fff;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s ease, transform 0.2s ease;
    }
    .btn-agree:hover {
      background: #059669;
      transform: translateY(-1px);
    }
  `]
})
export class RentalNoteDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<RentalNoteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private readonly data: { rentalType: RentalType },
    private readonly router: Router
  ) {}

  agree(): void {
    this.dialogRef.close();
    const routeMap: Record<RentalType, string> = {
      flat: '/owner/flat/details',
      room: '/owner/room/details',
      pg: '/owner/pg/details',
      'hourly-room': '/owner/hourly-room/details'
    };
    this.router.navigate([routeMap[this.data.rentalType]]);
  }
}
