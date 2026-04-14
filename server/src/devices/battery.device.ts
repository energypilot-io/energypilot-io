export abstract class BatteryDevice {
    static DEVICE_TYPE: string = 'battery'

    abstract getBatterySoCValue(delta: number): Promise<number | undefined>
    abstract getBatteryPowerValue(delta: number): Promise<number | undefined>
}
