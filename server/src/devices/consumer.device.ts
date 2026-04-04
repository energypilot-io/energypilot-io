export abstract class ConsumerDevice {
    static DEVICE_TYPE: string = 'consumer'

    abstract getConsumerPowerValue(): Promise<number | undefined>
    abstract getConsumerEnergyValue(): Promise<number | undefined>
}
