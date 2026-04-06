import { Component, inject, Input } from '@angular/core'
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap'
import { TranslatePipe } from '@ngx-translate/core'

@Component({
    selector: 'app-confirm-dialog',
    imports: [TranslatePipe],
    templateUrl: './confirm-dialog.html',
    styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
    modal = inject(NgbActiveModal)

    @Input() title: string = ''
    @Input() message: string = ''
    @Input() description: string = ''
    @Input() cancelText: string = 'common.buttons.cancel'
    @Input() confirmText: string = 'common.buttons.confirm'

}
