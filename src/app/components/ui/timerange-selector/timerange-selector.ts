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
    MatDatepickerInputEvent,
    MatDatepickerModule,
} from '@angular/material/datepicker'
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
import { DeviceDetectorService } from 'ngx-device-detector'
import {
    MatButtonToggleChange,
    MatButtonToggleModule,
} from '@angular/material/button-toggle'
import { KeyValuePipe } from '@angular/common'

enum TimeRange {
    Day = 'day',
    Week = 'week',
    Month = 'month',
    Year = 'year',
    Custom = 'custom',
}

export type onTimeRangeChangeEvent = {
    fromDate: Date
    toDate: Date
}

@Component({
    selector: 'app-timerange-selector',
    imports: [
        MatButtonModule,
        MatIconModule,
        TranslatePipe,
        MatDatepickerModule,
        MatButtonToggleModule,
        KeyValuePipe,
    ],
    templateUrl: './timerange-selector.html',
    styleUrl: './timerange-selector.css',
})
export class TimerangeSelectorComponent {
    private timeRangeModifier = signal<number>(0)

    protected readonly isMobile = signal(true)

    fromDate = signal<Date>(new Date())
    toDate = signal<Date>(new Date())

    currentTimeRange = signal<TimeRange>(TimeRange.Day)

    @Output() onTimeRangeChange = new EventEmitter<onTimeRangeChangeEvent>()

    currentTimeRangeLabel = computed<string>(() => {
        const fromDate = this.fromDate().toLocaleDateString()
        const toDate = this.toDate().toLocaleDateString()

        if (fromDate === toDate) {
            return fromDate
        }

        return `${fromDate} - ${toDate}`
    })

    constructor(private deviceService: DeviceDetectorService) {
        effect(() => {
            if (this.currentTimeRange() !== TimeRange.Custom) {
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
            }

            if (this.fromDate() && this.toDate()) {
                this.onTimeRangeChange.emit({
                    fromDate: startOfDay(this.fromDate()),
                    toDate: endOfDay(this.toDate()),
                })
            }
        })

        this.isMobile.set(deviceService.isMobile())
    }

    onDateChange(targetDate: string, event: MatDatepickerInputEvent<Date>) {
        this.setTimeRange(TimeRange.Custom)

        if (targetDate === 'from') {
            this.fromDate.set(event.value!)
        } else if (targetDate === 'to') {
            this.toDate.set(event.value!)
        }
    }

    onTimeRangeSelectionChange(event: MatButtonToggleChange) {
        this.setTimeRange(event.value as unknown as TimeRange)
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
