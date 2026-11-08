import { Component, ElementRef, input, viewChild } from '@angular/core';

/**
 * Foto mit Lupen-Button. Der Klick öffnet das Foto in einem Vollbild-Overlay (natives `<dialog>`):
 * Esc oder der Schließen-Button beenden es, der Fokus kehrt zur Lupe zurück.
 */
@Component({
  selector: 'app-photo-zoom',
  template: `
    <figure class="photo-zoom">
      <img class="photo-zoom__image" loading="lazy" [src]="src()" [alt]="alt()" />
      <button
        type="button"
        class="photo-zoom__open-button"
        aria-haspopup="dialog"
        aria-label="Foto im Vollbild öffnen"
        (click)="open()"
      >
        <svg
          class="photo-zoom__icon"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="10" cy="10" r="6" />
          <path d="M15 15l6 6" />
        </svg>
      </button>
    </figure>

    <dialog #viewer class="photo-zoom__dialog" aria-label="Foto im Vollbild">
      <img class="photo-zoom__full-image" [src]="src()" [alt]="alt()" />
      <button
        type="button"
        class="photo-zoom__close-button"
        aria-label="Vollbild schließen"
        (click)="close()"
      >
        ×
      </button>
    </dialog>
  `,
})
export class PhotoZoom {
  readonly src = input.required<string>();
  readonly alt = input.required<string>();

  private readonly viewer = viewChild.required<ElementRef<HTMLDialogElement>>('viewer');

  /** Öffnet das Vollbild-Overlay. */
  protected open(): void {
    this.viewer().nativeElement.showModal();
  }

  /** Schließt das Vollbild-Overlay. */
  protected close(): void {
    this.viewer().nativeElement.close();
  }
}
