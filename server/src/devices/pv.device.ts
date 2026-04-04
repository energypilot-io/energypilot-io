export abstract class PVDevice {
    static DEVICE_TYPE: string = 'pv'

    abstract getPVPowerValue(): Promise<number | undefined>
    abstract getPVEnergyValue(): Promise<number | undefined>
}
