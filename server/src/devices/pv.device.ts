export abstract class PVDevice {
    static DEVICE_TYPE: string = 'pv'

    abstract getPVPowerValue(delta: number): Promise<number | undefined>
    abstract getPVEnergyValue(delta: number): Promise<number | undefined>
}
