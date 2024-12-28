import { DeviceDef } from 'server/defs/configuration'

export const defaultDeviceConfig: DeviceDef = {
    id: '',
}

export interface IDevice {
    id: string
}
