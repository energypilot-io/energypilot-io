export abstract class ConsumerDevice {
    static DEVICE_TYPE: string = 'consumer'

    static getConsumerPropertiesSchema(): object {
        return {}
    }

    abstract getConsumerPowerValue(delta: number): Promise<number | undefined>
    abstract getConsumerEnergyValue(delta: number): Promise<number | undefined>
}
