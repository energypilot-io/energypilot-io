import { Component, inject, Input } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'

@Component({
    selector: 'app-confirm-dialog',
    imports: [],
    templateUrl: './confirm-dialog.html',
    styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
    modal = inject(NgbActiveModal)

    @Input() title: string = ''
}
