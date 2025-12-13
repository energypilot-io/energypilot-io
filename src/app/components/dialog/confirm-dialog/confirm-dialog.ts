import { Component, inject } from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import {
    MAT_DIALOG_DATA,
    MatDialogModule,
    MatDialogRef,
} from '@angular/material/dialog'

@Component({
    selector: 'app-confirm-dialog',
    imports: [MatButtonModule, MatDialogModule],
    templateUrl: './confirm-dialog.html',
    styleUrl: './confirm-dialog.css',
})
export class ConfirmDialogComponent {
    data = inject(MAT_DIALOG_DATA)

    title: string
    message: string

    constructor(public dialogRef: MatDialogRef<ConfirmDialogComponent>) {
        // Update view with given values
        this.title = this.data.title
        this.message = this.data.message
    }

    onConfirm(): void {
        this.dialogRef.close(true)
    }

    onDismiss(): void {
        this.dialogRef.close(false)
    }
}
