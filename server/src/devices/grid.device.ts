export abstract class GridDevice {
    static DEVICE_TYPE: string = 'grid'

    abstract getGridPowerValue(): Promise<number | undefined>
    abstract getGridEnergyImportValue(): Promise<number | undefined>
    abstract getGridEnergyExportValue(): Promise<number | undefined>
}
