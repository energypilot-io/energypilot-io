import { IParameter } from '@/libs/templates/template-parser'
import { BaseDevice } from './base-device'
import { IInterface } from '@/interfaces/interface'
import { Device } from '@/entities/device.entity'
import { DeviceTemplateDef } from '@/defs/device-template'

export class GridDevice extends BaseDevice {
    private _powerParameter: IParameter | undefined

    private _energyImportParameter: IParameter | undefined
    private _energyExportParameter: IParameter | undefined

    constructor(
        connector: IInterface,
        templateDef: Partial<DeviceTemplateDef> = {},
        deviceDefinition: Device
    ) {
        super(connector, deviceDefinition)

        this._powerParameter = this.getParameter(templateDef.grid, 'power')

        this._energyImportParameter = this.getParameter(
            templateDef.grid,
            'energyImport'
        )

        this._energyExportParameter = this.getParameter(
            templateDef.grid,
            'energyExport'
        )
    }

    public async getPowerValue() {
        if (this._powerParameter === undefined) return 0

        const powerValue = await this._powerParameter?.getValue()
        if (powerValue !== undefined) {
            this._logger.debug(`Read Power [${powerValue} W]`)
        }
        return powerValue
    }

    public async getEnergyImportValue() {
        if (this._energyImportParameter === undefined) return 0

        const energyValue = await this._energyImportParameter?.getValue()
        if (energyValue !== undefined) {
            this._logger.debug(`Read Energy Import [${energyValue} kWh]`)
        }

        return energyValue
    }

    public async getEnergyExportValue() {
        if (this._energyExportParameter === undefined) return 0

        const energyValue = await this._energyExportParameter?.getValue()
        if (energyValue !== undefined) {
            this._logger.debug(`Read Energy Export [${energyValue} kWh]`)
        }

        return energyValue
    }
}
