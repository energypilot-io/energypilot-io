export default {
    app: {
        name: 'EnergyPilot.io',
        version: 'v0.1 ALPHA',
    },

    sidebar: {
        platformGroup: {
            title: 'Platform',
        },
    },

    pages: {
        dashboard: {
            title: 'Dashboard',
        },

        liveData: {
            title: 'Live Data',
        },
    },

    energyProductionCard: {
        title: 'Energy Production',
        description: 'The energy produced by your solar panels in kWh',

        totalEnergy: 'Total {{energy}}',

        timeframes: {
            today: 'Today',
            last7Days: 'Last 7 days',
            last30Days: 'Last 30 days',
        },
    },

    energyImportCard: {
        title: 'Energy Import',
        description: 'Energy imported from the grid in kWh',

        totalEnergy: 'Total {{energy}}',

        timeframes: {
            today: 'Today',
            last7Days: 'Last 7 days',
            last30Days: 'Last 30 days',
        },
    },

    liveEnergyCard: {
        title: 'Live',
        description: 'Current energy production and consumption',
    },
}
