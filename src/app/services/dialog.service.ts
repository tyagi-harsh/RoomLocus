import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DialogService {
    private _visible = signal(false);
    private _message = signal<string>('');
    private _buttonLabel = signal<string>('OK');
    private _action: (() => void) | null = null;

    visible = () => this._visible();
    message = () => this._message();
    buttonLabel = () => this._buttonLabel();

    show(message: string, action?: () => void, buttonLabel: string = 'OK') {
        this._message.set(message);
        this._buttonLabel.set(buttonLabel);
        this._action = action ?? null;
        this._visible.set(true);
    }

    hide() {
        this._visible.set(false);
        this._message.set('');
        this._buttonLabel.set('OK');
        this._action = null;
    }

    confirm() {
        const action = this._action;
        this.hide();
        try {
            action && action();
        } catch (err) {
            // no-op: avoid crashing UI on action errors
            console.warn('Dialog action failed', err);
        }
    }
}
