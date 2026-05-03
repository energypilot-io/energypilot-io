import { Component } from '@angular/core'
import { TranslatePipe } from '@ngx-translate/core'

@Component({
    selector: 'widget-solar-forecast',
    imports: [TranslatePipe],
    templateUrl: './solar-forecast.html',
    styleUrl: './solar-forecast.scss',
})
export class SolarForecastWidget {}
