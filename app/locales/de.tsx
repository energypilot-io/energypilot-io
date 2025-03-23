import { info } from 'console'

export default {
    consts: {
        energy: 'Energie',
        power: 'Leistung',
        soc: 'SoC',
        energyImport: 'Energie Import',
        energyExport: 'Energie Export',

        templateTypes: {
            pv: 'PV',
            grid: 'Netz',
            battery: 'Batterie',
            consumer: 'Verbraucher',
        },

        buttons: {
            cancel: 'Abbrechen',
            delete: 'Entfernen',
            update: 'Aktualisieren',
            create: 'Erstellen',
            edit: 'Bearbeiten',
            save_settings: 'Einstellungen speichern',
        },
    },

    navigation: {
        groups: {
            platform: 'Plattform',
        },

        pages: {
            dashboard: {
                title: 'Dashboard',
            },

            graph: {
                title: 'Graph',
            },

            settings: {
                title: 'Einstellungen',

                devices: {
                    title: 'Geräte',
                },

                common: {
                    title: 'Allgemein',
                },
            },
        },
    },

    messages: {
        errors: {
            db: {
                cannotCreateDevice: 'Kann Gerät nicht in Datenbank speichern.',
                cannotCreateSetting:
                    'Kann Einstellungen nicht in Datenbank speichern.',
                createDeviceConstraintViolation:
                    'Gerät kann aufgrund von Einschränkungsverletzungen nicht in die Datenbank geschrieben werden. Bitte ändern Sie den Namen und versuchen Sie es erneut.',
            },
        },

        questions: {
            deleteDevice: {
                title: 'Gerät entfernen',
                description:
                    'Wollen Sie das Gerät [{{deviceName}}] wirklich entfernen? Achtung: das Entfernen eines Geräts kann nicht rückgängig gemacht werden!',
            },
        },

        success: {
            settings_saved: 'Einstellungen erfolgreich gespeichert.',
        },

        info: {
            noDevicesFound: 'Keine Geräte gefunden.',
        },
    },

    settings: {
        data: {
            label: 'Daten',

            poll_interval: {
                label: 'Abfrage Intervall',
            },

            snapshot_interval: {
                label: 'Snapshot Intervall',
            },
        },

        logging: {
            label: 'Logging',

            loglevel: {
                label: 'Log Level',

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

            port: {
                label: 'Port',
            },
        },

        weather: {
            label: 'Wetter',

            api_key: {
                label: 'API Schlüssel',
            },

            forecast_days: {
                label: 'Vorschau Tage',
            },

            units: {
                label: 'Einheiten',

                values: {
                    us: 'US (°F)',
                    metric: 'Metrisch (°C)',
                },
            },

            query: {
                label: 'Abfrage Ort',
                description:
                    'Parameter um den Abfrage Ort zu bestimmen. Der Parameter kann folgende Werte haben: Längen- und Breitengrad, Ortsname, US zip, UK postcode, Canada postal code,...',
            },
        },

        dashboard: {
            cards: {
                label: 'Karten',
            },
        },
    },

    cards: {
        deviceCard: {
            liveData: 'Live Daten',
            power: 'Leistung',
            energy: 'Energie',
            energyImport: 'Energie Import',
            energyExport: 'Energie Export',
            soc: 'SoC',
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

        liveWeatherCard: {
            title: 'Wetter',
            description: 'Live Wetterdaten',
        },
    },

    dialogs: {
        upsertDevice: {
            selectTemplatePlaceholder: 'Geräte Template wählen',
            selectInterfacePlaceholder: 'Geräte Schnittstelle wählen',

            create: {
                title: 'Gerät erstellen',
                description:
                    'Erstelle und konfiguriere ein neues Gerät für EnergyPilot.io.',
            },
            update: {
                title: 'Gerät aktualisieren',
                description:
                    'Ändere und aktualisiere die Konfiguration eines Geräts für EnergyPilot.io.',
            },
        },
    },

    tooltips: {
        visibility: {
            setInvisible: 'Verstecken',
            setVisible: 'Anzeigen',
        },
        moveCard: 'Karte verschieben',
    },
}
