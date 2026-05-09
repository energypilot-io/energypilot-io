import { ToastService } from '@/app/services/toast.service'
import { Component, inject } from '@angular/core'
import { NgbToast } from '@ng-bootstrap/ng-bootstrap'

@Component({
    selector: 'app-toast-container',
    imports: [NgbToast],
    templateUrl: './toast-container.html',
    styleUrl: './toast-container.scss',
    host: {
        class: 'toast-container position-fixed top-0 end-0 p-3',
        style: 'z-index: 1200',
    },
})
export class ToastContainer {
    readonly toastService = inject(ToastService)
}
