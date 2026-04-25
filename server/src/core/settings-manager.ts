export async function initSettingsManager() {}

export function getSettingSchema() {
    return {
        type: 'object',
        properties: {
            polling_rate: {
                title: '{{ settings.pollingRate }}',
                type: 'number',
                minimum: 1,
                maximum: 200,
                default: 10,
            },
        },

        required: ['device_name', 'device_type'],
    }
}
