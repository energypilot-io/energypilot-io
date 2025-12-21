import { ApiService } from '@/app/services/api.service'
import {
    ChangeDetectionStrategy,
    Component,
    inject,
    signal,
} from '@angular/core'
import { FormGroup, ReactiveFormsModule } from '@angular/forms'
import { MatButtonModule } from '@angular/material/button'
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog'
import { FormlyFieldConfig, FormlyForm } from '@ngx-formly/core'
import { FormlyJsonschema } from '@ngx-formly/core/json-schema'

@Component({
    selector: 'app-create-device',
    imports: [
        MatButtonModule,
        MatDialogModule,
        ReactiveFormsModule,
        FormlyForm,
    ],
    templateUrl: './create-device.html',
    styleUrl: './create-device.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateDeviceComponent {
    readonly api = inject(ApiService)

    data = inject(MAT_DIALOG_DATA)

    fields = signal<FormlyFieldConfig[]>([])

    form = new FormGroup({})
    model: any = this.data || {}
    schema = signal<object>({})

    constructor(private formlyJsonschema: FormlyJsonschema) {}

    ngOnInit() {
        this.api.getData().subscribe(result => {
            this.fields.set([new FormlyJsonschema().toFieldConfig(result)])
            this.schema.set(result)
        })
    }

    onSubmit(model: object) {
        console.log(model)

        // this.api.sendData(model).subscribe(response => {
        //     console.log(response)
        // })
    }
}
