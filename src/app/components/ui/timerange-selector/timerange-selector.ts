import {
    Component,
    computed,
    effect,
    EventEmitter,
    inject,
    Output,
    signal,
} from '@angular/core'
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

import {
    tablerCircleChevronLeft,
    tablerCircleChevronRight,
    tablerCalendarMonth,
} from '@ng-icons/tabler-icons'
import {
    NgbCalendar,
    NgbDate,
    NgbDateParserFormatter,
    NgbModule,
} from '@ng-bootstrap/ng-bootstrap'

import {
    LangChangeEvent,
    TranslatePipe,
    TranslateService,
} from '@ngx-translate/core'
import { KeyValuePipe } from '@angular/common'
import { NgIcon, provideIcons } from '@ng-icons/core'

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
    imports: [TranslatePipe, KeyValuePipe, NgIcon, NgbModule],
    templateUrl: './timerange-selector.html',
    styleUrl: './timerange-selector.scss',
    providers: [
        provideIcons({
            tablerCircleChevronLeft,
            tablerCircleChevronRight,
            tablerCalendarMonth,
        }),
    ],
})
export class TimerangeSelector {
    private translate = inject(TranslateService)
    private calendar = inject(NgbCalendar)
    formatter = inject(NgbDateParserFormatter)

    private timeRangeModifier = signal<number>(0)

    private language = signal<string>(this.translate.getCurrentLang())

    hoveredDate: NgbDate | null = null
    fromDate = signal<Date>(new Date())
    toDate = signal<Date | null>(null)

    currentTimeRange = signal<TimeRange>(TimeRange.Day)

    @Output() onTimeRangeChange = new EventEmitter<onTimeRangeChangeEvent>()

    currentTimeRangeLabel = computed<string>(() => {
        const fromDate = this.fromDate().toLocaleDateString(
            this.language() == 'en' ? 'en-US' : 'de-DE'
        )
        const toDate = this.toDate()?.toLocaleDateString(
            this.language() == 'en' ? 'en-US' : 'de-DE'
        )

        if (fromDate === toDate) {
            return fromDate
        }

        return `${fromDate} - ${toDate}`
    })

    ngOnInit(): void {
        this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
            this.language.set(event.lang)
        })
    }

    constructor() {
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
                    toDate: endOfDay(this.toDate() ?? this.fromDate()),
                })
            }
        })
    }

    onDateSelection(date: NgbDate) {
        const convertedDate = this.fromNgbDate(date)

        if (!this.fromDate() && !this.toDate()) {
            this.fromDate.update(() => convertedDate)
        } else if (
            this.fromDate() &&
            !this.toDate() &&
            date &&
            date.after(this.toNgbDate(this.fromDate()))
        ) {
            this.toDate.set(convertedDate)
        } else {
            this.toDate.set(null)
            this.fromDate.update(() => convertedDate)
        }
    }

    fromNgbDate(date: NgbDate): Date {
        return startOfDay(new Date(date.year, date.month - 1, date.day))
    }

    toNgbDate(date: Date): NgbDate {
        if (!date) {
            return null as any
        }

        return new NgbDate(
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate()
        )
    }

    formatDate(date: Date | null): string | null {
        if (!date) {
            return null
        }

        return date.toLocaleDateString(
            this.language() == 'en' ? 'en-US' : 'de-DE'
        )
    }

    /*
     * NgbDatepicker related code is based on https://ng-bootstrap.github.io/#/components/datepicker/examples
     */

    isHovered(date: NgbDate) {
        return (
            this.fromDate() &&
            !this.toDate() &&
            this.hoveredDate &&
            date.after(this.toNgbDate(this.fromDate())) &&
            date.before(this.hoveredDate)
        )
    }

    isInside(date: NgbDate) {
        return (
            this.toDate() &&
            date.after(this.toNgbDate(this.fromDate())) &&
            date.before(this.toNgbDate(this.toDate()!))
        )
    }

    isRange(date: NgbDate) {
        return (
            date.equals(this.toNgbDate(this.fromDate())) ||
            (this.toDate() && date.equals(this.toNgbDate(this.toDate()!))) ||
            this.isInside(date) ||
            this.isHovered(date)
        )
    }

    validateInput(currentValue: Date | null, input: string): Date | null {
        const parsed = this.formatter.parse(input)
        return parsed && this.calendar.isValid(NgbDate.from(parsed))
            ? this.fromNgbDate(NgbDate.from(parsed)!)
            : currentValue
    }

    onTimeRangeSelectionChange(newTimeRange: TimeRange) {
        this.setTimeRange(newTimeRange)
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
