import { EnergyExportCard } from '~/components/energypilot/cards/dashboard/energy-export'
import { EnergyImportCard } from '~/components/energypilot/cards/dashboard/energy-import'
import { EnergyProductionCard } from '~/components/energypilot/cards/dashboard/energy-production'
import { LiveEnergyCard } from '~/components/energypilot/cards/dashboard/live-energy'
import { LiveWeatherCard } from '~/components/energypilot/cards/dashboard/live-weather'

export const WS_EVENT_LIVEDATA_UPDATED = 'live-data-updated'
export const WS_EVENT_WEATHER_LIVEDATA_UPDATED = 'live-weather-updated'

export const WS_EVENT_SNAPSHOT_CREATED = 'snapshot-created'

export const DASHBOARD_CARDS: {
    [key: string]: { class: any; defaultVisibility: boolean }
} = {
    energyProductionCard: {
        class: EnergyProductionCard,
        defaultVisibility: true,
    },

    energyImportCard: {
        class: EnergyImportCard,
        defaultVisibility: true,
    },
    energyExportCard: {
        class: EnergyExportCard,
        defaultVisibility: true,
    },
    liveEnergyCard: {
        class: LiveEnergyCard,
        defaultVisibility: true,
    },
    liveWeatherCard: {
        class: LiveWeatherCard,
        defaultVisibility: false,
    },
}
