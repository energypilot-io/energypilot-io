import { LoaderFunctionArgs } from '@remix-run/node'

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
    const interfaceName = params.interfaceName
    const interfaceClasses: { [key: string]: any } =
        context.connectorClasses as any

    if (interfaceName === undefined) return {}

    return interfaceClasses[interfaceName].getConnectorParameterDefs()
}
