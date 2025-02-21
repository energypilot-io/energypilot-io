export default {
    app: {
        name: 'EnergyPilot.io',
        version: 'v0.1',
    },

    consts: {
        templateTypes: {
            pv: 'PV',
            grid: 'Grid',
            battery: 'Battery',
            consumer: 'Consumer',
        },

        buttons: {
            cancel: 'Cancel',
            delete: 'Delete',
            update: 'Update',
            create: 'Create',
            edit: 'Edit',
            save_settings: 'Save Settings',
        },
    },

    navigation: {
        groups: {
            platform: 'Platform',
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

                common: {
                    title: 'Common',
                },
            },
        },
    },

    messages: {
        errors: {
            db: {
                cannotCreateDevice: 'Cannot write device to database.',
                cannotCreateSetting: 'Cannot write setting to database.',
                createDeviceConstraintViolation:
                    'Cannot write device to database due to constraint violation. Please change the name of your new device and try again.',
            },
        },

        questions: {
            deleteDevice: {
                title: 'Delete Device',
                description:
                    'Do you really want to delete the device [{{deviceName}}]? Warning: this change cannot be undone!',
            },
        },

        success: {
            settings_saved: 'Settings saved successfully.',
        },
    },

    settings: {
        data: {
            label: 'Data',
            description: 'Settings for data collection',

            poll_interval: {
                label: 'Polling Interval',
            },

            snapshot_interval: {
                label: 'Snapshot Interval',
            },
        },

        logging: {
            label: 'Logging',

            loglevel: {
                label: 'Log Level',
                description: 'The log level for EnergyPilot.io',

                values: {
                    debug: 'Debug',
                    error: 'Error',
                    warn: 'Warn',
                    info: 'Info',
                    fail: 'Fail',
                    verbose: 'Verbose',
                },
            },
        },

        webserver: {
            label: 'Webserver',
            description: 'Settings for the UI webserver',

            port: {
                label: 'Port',
            },
        },
    },

    cards: {
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
    },

    dialogs: {
        upsertDevice: {
            create: {
                title: 'Create Device',
                description:
                    'Configure and add a new device to EnergyPilot.io.',
            },
            update: {
                title: 'Update Device',
                description:
                    'Change configuration and update a device for EnergyPilot.io.',
            },
        },
    },
}
