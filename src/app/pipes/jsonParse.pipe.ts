import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
    name: 'jsonParse',
})
export class JsonParsePipe implements PipeTransform {
    transform(value: string): object {
        return JSON.parse(value)
    }
}
