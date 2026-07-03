export abstract class GridDevice {
    static DEVICE_TYPE: string = 'grid'

    static getGridPropertiesSchema(): object {
        return {}
    }

    abstract getGridPowerValue(delta: number): Promise<number | undefined>
    abstract getGridEnergyImportValue(
        delta: number
    ): Promise<number | undefined>
    abstract getGridEnergyExportValue(
        delta: number
    ): Promise<number | undefined>
}
