import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[appNumericOnly]',
  standalone: true,
})
export class NumericOnlyDirective {
  private static readonly allowedKeys = [
    'Backspace',
    'Tab',
    'End',
    'Home',
    'ArrowLeft',
    'ArrowRight',
    'Delete',
  ];

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const { key } = event;
    if (NumericOnlyDirective.allowedKeys.includes(key)) {
      return;
    }
    if (key.length === 1 && !/\d/.test(key)) {
      event.preventDefault();
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text/plain') ?? '';
    if (!/^[0-9]*$/.test(pasted)) {
      event.preventDefault();
    }
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const sanitized = target.value.replace(/[^0-9]/g, '');
    if (sanitized !== target.value) {
      target.value = sanitized;
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}
