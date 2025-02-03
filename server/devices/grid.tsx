import { TemplateDef } from 'server/defs/template'
import { IParameter } from 'templates/template-parser'
import { BaseDevice } from './base-device'
import { IInterface } from 'server/interfaces/IInterface'
import { Device } from 'server/database/entities/device.entity'

export class GridDevice extends BaseDevice {
    private _powerParameter: IParameter | undefined

    private _energyImportParameter: IParameter | undefined
    private _energyExportParameter: IParameter | undefined

    constructor(
        connector: IInterface,
        templateDef: Partial<TemplateDef> = {},
        deviceDefinition: Device
    ) {
        super(connector, templateDef.grid, deviceDefinition)

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
        if (this._powerParameter === undefined) return undefined

        const powerValue = await this._powerParameter?.getValue()
        if (powerValue !== undefined) {
            this._logger.debug(`Read Power [${powerValue} W]`)
        }
        return powerValue
    }

    public async getEnergyImportValue() {
        if (this._energyImportParameter === undefined) return undefined

        const energyValue = await this._energyImportParameter?.getValue()
        if (energyValue !== undefined) {
            this._logger.debug(`Read Energy Import [${energyValue} kWh]`)
        }

        return energyValue
    }

    public async getEnergyExportValue() {
        if (this._energyExportParameter === undefined) return undefined

        const energyValue = await this._energyExportParameter?.getValue()
        if (energyValue !== undefined) {
            this._logger.debug(`Read Energy Export [${energyValue} kWh]`)
        }

        return energyValue
    }
}
