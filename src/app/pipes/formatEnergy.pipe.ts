import { formatEnergy } from '@/app/libs/utils'
import { Pipe, PipeTransform } from '@angular/core'
@Pipe({
    name: 'energy',
})
export class FormatEnergyPipe implements PipeTransform {
    transform(value: number): string {
        const formatedEnergy = formatEnergy(value)
        return `${formatedEnergy.value} ${formatedEnergy.unit}`
    }
}
