import { Component, inject, OutputEmitterRef, signal } from '@angular/core'
import { EnergyDistributionWidget } from '../../components/widgets/energy-distribution/energy-distribution'
import { EnergyKpisWidget } from '@/app/components/widgets/energy-kpis/energy-kpis'
import { EnergyLiveValuesWidget } from '@/app/components/widgets/energy-live-values/energy-live-values'
import { SolarForecastWidget } from '@/app/components/widgets/solar-forecast/solar-forecast'
import { NgComponentOutlet } from '@angular/common'
import { ApiService } from '@/app/services/api.service'

@Component({
    selector: 'app-dashboard',
    imports: [NgComponentOutlet],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.scss',
})
export class DashboardPage {
    readonly api = inject(ApiService)

    static storageKey = 'dashboard.widgets.order'

    moveUpEvent = new OutputEmitterRef<string>()
    moveDownEvent = new OutputEmitterRef<string>()

    private _basicWidgets = [
        EnergyKpisWidget,
        EnergyDistributionWidget,
        EnergyLiveValuesWidget,
    ]

    private _modulesWidgets = [SolarForecastWidget]

    widgets = signal<any[]>([])

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

        this.storeStatus()
    }

    ngOnInit(): void {
        this.moveUpEvent.subscribe((name: string) => this.doMoveUp(name))
        this.moveDownEvent.subscribe((name: string) => this.doMoveDown(name))

        this.api.getActiveModules().subscribe(response => {
            console.log('Active modules:', response)

            const activeWidgets = [
                ...this._basicWidgets,
                ...this._modulesWidgets.filter(widget =>
                    response.includes(widget.name)
                ),
            ]

            const storedWidgetList = this.getStoredStatus()
            if (storedWidgetList) {
                this.widgets.set(
                    activeWidgets.sort(
                        (a, b) =>
                            storedWidgetList.indexOf(a.name) -
                            storedWidgetList.indexOf(b.name)
                    )
                )
            }
        })
    }

    storeStatus() {
        try {
            window.localStorage[DashboardPage.storageKey] = JSON.stringify(
                this.widgets().map(widget => widget.name)
            )
        } catch {}
    }

    getStoredStatus(): string[] | null {
        try {
            return JSON.parse(
                window.localStorage[DashboardPage.storageKey] || '[]'
            )
        } catch {
            return null
        }
    }
}
