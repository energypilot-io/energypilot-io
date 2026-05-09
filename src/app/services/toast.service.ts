import { Injectable, signal, TemplateRef } from '@angular/core'

export interface ToastInfo {
    class?: string
    header: string
    body: string
    delay?: number
}

@Injectable({ providedIn: 'root' })
export class ToastService {
    private readonly _toasts = signal<ToastInfo[]>([])
    readonly toasts = this._toasts.asReadonly()

    show(toast: ToastInfo) {
        this._toasts.update(toasts => [...toasts, toast])
    }

    remove(toast: ToastInfo) {
        this._toasts.update(toasts => toasts.filter(t => t !== toast))
    }

    clear() {
        this._toasts.set([])
    }
}
