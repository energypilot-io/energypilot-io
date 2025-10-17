import { Component, signal, inject } from '@angular/core'
import { ApiService } from '../services/api.service'
import { MatButtonModule } from '@angular/material/button'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { FormlyJsonschema } from '@ngx-formly/core/json-schema'
import { FormlyFieldConfig, FormlyForm } from '@ngx-formly/core'
import { JsonPipe } from '@angular/common'
import { FormGroup, ReactiveFormsModule } from '@angular/forms'

@Component({
    selector: 'api-test',
    templateUrl: './test.html',
    imports: [
        MatButtonModule,
        MatSlideToggleModule,
        JsonPipe,
        ReactiveFormsModule,
        FormlyForm,
    ],
})
export class AppComponent {
    constructor(private formlyJsonschema: FormlyJsonschema) {}

    private api = inject(ApiService)

    form = new FormGroup({})
    model: any = {}

    schema = signal<object>({})

    onSubmit(model: object) {
        console.log(model)
    }

    fields = signal<FormlyFieldConfig[]>([])

    fetchData() {
        this.api.getData().subscribe((result) => {
            this.fields.set([new FormlyJsonschema().toFieldConfig(result)])

            this.schema.set(result)
            console.log(result)
        })
    }
}
