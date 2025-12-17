import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface TokenDialogData {
    title?: string;
    message?: string;
    accessToken?: string;
    refreshToken?: string;
    id?: string | number;
    username?: string;
}

@Component({
    selector: 'app-token-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule],
    template: `
    <h2 mat-dialog-title>{{ data.title || 'Info' }}</h2>
    <div mat-dialog-content>
      <p *ngIf="data.message">{{ data.message }}</p>
      <p *ngIf="data.username">Name: <strong>{{ data.username }}</strong></p>
      <p *ngIf="data.id">ID: <strong>{{ data.id }}</strong></p>
      <div *ngIf="data.accessToken">
        <p><strong>Access Token</strong></p>
        <textarea readonly rows="4" style="width:100%">{{ data.accessToken }}</textarea>
      </div>
      <div *ngIf="data.refreshToken" style="margin-top:8px">
        <p><strong>Refresh Token</strong></p>
        <textarea readonly rows="3" style="width:100%">{{ data.refreshToken }}</textarea>
      </div>
    </div>
    <div mat-dialog-actions style="justify-content: center;">
      <button mat-flat-button color="primary" (click)="close()">Close</button>
    </div>
  `,
})
export class TokenDialogComponent {
    constructor(public dialogRef: MatDialogRef<TokenDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: TokenDialogData) { }

    close() {
        this.dialogRef.close();
    }
}
