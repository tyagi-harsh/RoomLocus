import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private readonly defaultDuration = 4000;

  constructor(private snackBar: MatSnackBar) {}

  show(message: string, type: ToastType = 'info', duration?: number): void {
    const config: MatSnackBarConfig = {
      duration: duration ?? this.defaultDuration,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: this.getPanelClass(type),
    };
    this.snackBar.open(message, 'Close', config);
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number): void {
    this.show(message, 'error', duration ?? 5000);
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  private getPanelClass(type: ToastType): string[] {
    switch (type) {
      case 'success':
        return ['toast-success'];
      case 'error':
        return ['toast-error'];
      case 'warning':
        return ['toast-warning'];
      case 'info':
      default:
        return ['toast-info'];
    }
  }
}
