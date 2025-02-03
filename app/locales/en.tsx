export default {
    app: {
        name: 'EnergyPilot.io',
        version: 'v0.1',
    },

    sidebar: {
        platformGroup: {
            title: 'Platform',
        },
    },

    consts: {
        templateTypes: {
            pv: 'PV',
            grid: 'Grid',
            battery: 'Battery',
            consumer: 'Consumer',
        },
    },

    errors: {
        db: {
            cannotCreateDevice: 'Cannot write device to database.',
            createDeviceConstraintViolation:
                'Cannot write device to database due to constraint violation. Please change the name of your new device and try again.',
        },
    },

    pages: {
        dashboard: {
            title: 'Dashboard',
        },

        graph: {
            title: 'Graph',
        },

        settings: {
            title: 'Settings',

            devices: {
                title: 'Devices',
            },
        },
    },

    dialogs: {
        newDevice: {
            title: 'New Device',
            description: 'Configure and add a new device to EnergyPilot.io',
        },
    },

    alerts: {
        deleteDevice: {
            title: 'Delete Device',
            description:
                'Do you really want to delete the device [{{deviceName}}]? Warning: this change cannot be undone!',
        },
    },

    buttons: {
        cancel: 'Cancel',
        delete: 'Delete',
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

    energyExportCard: {
        title: 'Energy Export',
        description: 'Energy exported to the grid in kWh',

        totalEnergy: 'Total {{energy}}',
    },

    liveEnergyCard: {
        title: 'Live',
        description: 'Current energy production and consumption',

        nodes: {
            home: 'Home',
            battery: 'Battery',
            grid: 'Grid',
            solar: 'Solar',
        },
    },

    interfaces: {
        modbus: {
            tcpip: {
                title: 'TCP/IP',
                host: 'Host',
                port: 'Port',
            },

            serial: {
                title: 'Serial',
                device: 'Device',
                baud: 'Baud rate',
            },
        },

        tapo: {
            default: {
                email: 'E-Mail',
                password: 'Password',
                ip: 'IP',
            },
        },
    },
}
