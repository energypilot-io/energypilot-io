import { LoaderFunctionArgs } from '@remix-run/node'
import { InterfaceDef } from 'server/connectors/IConnector'

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
    const interfaceName = params.interfaceName
    const interfaceClasses: { [key: string]: any } = context.interfaces as any

    if (interfaceName === undefined) return {}

    return interfaceClasses[interfaceName] as InterfaceDef
}
