export default {
    sidebar: {
        platformGroup: {
            title: 'Plattform',
        },
    },

    pages: {
        dashboard: {
            title: 'Dashboard',
        },

        graph: {
            title: 'Graph',
        },
    },

    energyProductionCard: {
        title: 'Energie Produktion',
        description: 'Von den Solarpanels erzeugte Energiemenge in kWh',

        totalEnergy: 'Gesamt {{energy}}',

        timeframes: {
            today: 'Heute',
            last7Days: 'Letzten 7 Tage',
            last30Days: 'Letzten 30 Tage',
        },
    },

    energyImportCard: {
        title: 'Energie Import',
        description: 'Vom Netz importierte Energiemenge in kWh',

        totalEnergy: 'Gesamt {{energy}}',

        timeframes: {
            today: 'Heute',
            last7Days: 'Letzten 7 Tage',
            last30Days: 'Letzten 30 Tage',
        },
    },

    energyExportCard: {
        title: 'Energie Export',
        description: 'Ins Netz exportierte Energiemenge in kWh',

        totalEnergy: 'Gesamt {{energy}}',
    },

    liveEnergyCard: {
        title: 'Live',
        description: 'Aktuelle Energieproduktion und -verbrauch',

        nodes: {
            home: 'Heim',
            battery: 'Batterie',
            grid: 'Netz',
            solar: 'Solar',
        },
    },
}
