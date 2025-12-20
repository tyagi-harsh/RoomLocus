import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { DialogService } from './dialog.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private logoutTimer: ReturnType<typeof setTimeout> | null = null;
    private forcingLogout = false; // prevent duplicate dialogs from multiple 401s

    constructor(private router: Router, private dialog: DialogService) { }

    initFromStoredToken() {
        const token = this.safeGetLocalStorage('accessToken');
        if (!token) {
            this.clearTimer();
            return;
        }
        const exp = this.getTokenExpiry(token);
        if (!exp) {
            // invalid token, clear it and stay on current page
            this.performLogout(false);
            return;
        }
        const earlyMs = 30_000; // 30 seconds early
        const delay = exp * 1000 - Date.now() - earlyMs;
        if (delay <= 0) {
            this.performAutoLogout();
            return;
        }
        this.setTimer(delay);
    }

    onLogin(accessToken: string) {
        // after successful login, re-schedule with new token
        if (!accessToken) return;
        const exp = this.getTokenExpiry(accessToken);
        if (!exp) return;
        const earlyMs = 30_000;
        const delay = exp * 1000 - Date.now() - earlyMs;
        if (delay <= 0) {
            this.performAutoLogout();
            return;
        }
        this.setTimer(delay);
    }

    handleUnauthorizedOnce() {
        if (this.forcingLogout) return;
        this.forcingLogout = true;
        this.performAutoLogout();
    }

    manualLogout() {
        // for explicit user action if needed elsewhere
        this.performLogout(false);
        this.router.navigate(['/login']).catch(() => { });
    }

    private setTimer(delayMs: number) {
        this.clearTimer();
        this.logoutTimer = setTimeout(() => {
            this.performAutoLogout();
        }, Math.max(0, delayMs));
    }

    private clearTimer() {
        if (this.logoutTimer) {
            clearTimeout(this.logoutTimer);
            this.logoutTimer = null;
        }
    }

    private performAutoLogout() {
        this.performLogout(true);
    }

    private performLogout(showDialog: boolean) {
        this.clearTimer();
        try {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userType');
            localStorage.removeItem('userMobile');
        } catch (err) {
            // ignore
        }

        const afterNav = () => {
            this.forcingLogout = false;
            if (showDialog) {
                // Show dialog on the login page
                this.dialog.show('Session expired. Please log in again.', undefined, 'OK');
            }
        };

        // Navigate to login first, then optionally show dialog
        this.router.navigate(['/login']).then(afterNav).catch(() => afterNav());
    }

    private getTokenExpiry(token: string): number | null {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            const payload = parts[1];
            const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
            const json = JSON.parse(atob(normalized));
            if (!json || typeof json.exp !== 'number') return null;
            return json.exp; // seconds since epoch
        } catch {
            return null;
        }
    }

    private safeGetLocalStorage(key: string): string | null {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    }
}
