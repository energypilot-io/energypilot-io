import {
    Component,
    computed,
    effect,
    EventEmitter,
    Output,
    signal,
} from '@angular/core'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import {
    addDays,
    addMonths,
    addWeeks,
    addYears,
    endOfDay,
    endOfMonth,
    endOfWeek,
    endOfYear,
    startOfDay,
    startOfMonth,
    startOfWeek,
    startOfYear,
} from 'date-fns'

import { TranslatePipe } from '@ngx-translate/core'

enum TimeRange {
    Day = 'day',
    Week = 'week',
    Month = 'month',
    Year = 'year',
}

export type onTimeRangeChangeEvent = {
    fromDate: Date
    toDate: Date
}

@Component({
    selector: 'app-timerange-selector',
    imports: [MatButtonModule, MatIconModule, TranslatePipe],
    templateUrl: './timerange-selector.html',
    styleUrl: './timerange-selector.css',
})
export class TimerangeSelectorComponent {
    private fromDate = signal<Date>(new Date())
    private toDate = signal<Date>(new Date())

    private timeRangeModifier = signal<number>(0)

    currentTimeRange = signal<TimeRange>(TimeRange.Day)
    currentTimeRangeLabel = computed<string>(() => {
        const fromDate = this.fromDate().toLocaleDateString()
        const toDate = this.toDate().toLocaleDateString()

        if (fromDate === toDate) {
            return fromDate
        }

        return `${fromDate} - ${toDate}`
    })

    @Output() onTimeRangeChange = new EventEmitter<onTimeRangeChangeEvent>()

    constructor() {
        effect(() => {
            const now = new Date()

            if (this.currentTimeRange() === TimeRange.Day) {
                const date = addDays(now, this.timeRangeModifier())

                this.fromDate.set(startOfDay(date))
                this.toDate.set(endOfDay(date))
            } else if (this.currentTimeRange() === TimeRange.Week) {
                const date = addWeeks(now, this.timeRangeModifier())

                this.fromDate.set(startOfWeek(date))
                this.toDate.set(endOfWeek(date))
            } else if (this.currentTimeRange() === TimeRange.Month) {
                const date = addMonths(now, this.timeRangeModifier())

                this.fromDate.set(startOfMonth(date))
                this.toDate.set(endOfMonth(date))
            } else if (this.currentTimeRange() === TimeRange.Year) {
                const date = addYears(now, this.timeRangeModifier())

                this.fromDate.set(startOfYear(date))
                this.toDate.set(endOfYear(date))
            }

            this.onTimeRangeChange.emit({
                fromDate: this.fromDate(),
                toDate: this.toDate(),
            })
        })
    }

    public get TimeRange(): typeof TimeRange {
        return TimeRange
    }

    public setTimeRange(range: TimeRange): void {
        this.currentTimeRange.set(range)
        this.timeRangeModifier.set(0)
    }

    public incrementTimeRange(): void {
        this.timeRangeModifier.update(value => (value < 0 ? value + 1 : value))
    }

    public decrementTimeRange(): void {
        this.timeRangeModifier.update(value => value - 1)
    }
}
