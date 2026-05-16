import { Component, OutputEmitterRef, signal } from '@angular/core'
import { EnergyDistributionWidget } from '../../components/widgets/energy-distribution/energy-distribution'
import { EnergyKpisWidget } from '@/app/components/widgets/energy-kpis/energy-kpis'
import { EnergyLiveValuesWidget } from '@/app/components/widgets/energy-live-values/energy-live-values'
import { SolarForecastWidget } from '@/app/components/widgets/solar-forecast/solar-forecast'
import { NgComponentOutlet } from '@angular/common'

@Component({
    selector: 'app-dashboard',
    imports: [NgComponentOutlet],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.scss',
})
export class DashboardPage {
    moveUpEvent = new OutputEmitterRef<string>()
    moveDownEvent = new OutputEmitterRef<string>()

    widgets = signal<any[]>([
        EnergyKpisWidget,
        EnergyDistributionWidget,
        EnergyLiveValuesWidget,
        SolarForecastWidget,
    ])

    doMoveUp(name: string) {
        this.moveWidget(name, -1)
    }

    doMoveDown(name: string) {
        this.moveWidget(name, 1)
    }

    private moveWidget(widgetName: string, movement: number) {
        const arr = this.widgets()

        const widgetToMove = arr.find(widget => widget.name === widgetName)
        const oldIndex = arr.indexOf(widgetToMove)
        const newIndex = oldIndex + movement

        if (newIndex >= arr.length || newIndex < 0) return

        arr.splice(newIndex, 0, arr.splice(oldIndex, 1)[0])
    }

    ngOnInit(): void {
        this.moveUpEvent.subscribe((name: string) => this.doMoveUp(name))
        this.moveDownEvent.subscribe((name: string) => this.doMoveDown(name))
    }
}
