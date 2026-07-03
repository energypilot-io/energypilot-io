export abstract class BatteryDevice {
    static DEVICE_TYPE: string = 'battery'

    static getBatteryPropertiesSchema(): object {
        return {
            capacity: {
                title: '{{ device.battery.parameters.capacity }}',
                type: 'number',

                widget: {
                    formlyConfig: {
                        props: {
                            addonRight: {
                                text: 'kWh',
                            },
                        },
                    },
                },
            },
        }
    }

    abstract getBatterySoCValue(delta: number): Promise<number | undefined>
    abstract getBatteryPowerValue(delta: number): Promise<number | undefined>
}
