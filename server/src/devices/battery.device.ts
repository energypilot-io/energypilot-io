export abstract class BatteryDevice {
    static DEVICE_TYPE: string = 'battery'

    abstract getBatterySoCValue(): Promise<number | undefined>
    abstract getBatteryPowerValue(): Promise<number | undefined>
}
