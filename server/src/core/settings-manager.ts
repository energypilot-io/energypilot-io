export async function initSettingsManager() {}

export function getSettingSchema() {
    return {
        type: 'object',
        properties: {
            device_name: {
                type: 'string',
                title: '{{ device.interfaces.deviceName }}',
            },

            device_type: {
                type: 'string',
                title: '{{ device.interfaces.deviceType }}',
                enum: ['a', 'b', 'c'],
            },
        },

        required: ['device_name', 'device_type'],
    }
}
