import { LoaderFunctionArgs } from '@remix-run/node'
import { templates } from 'server/core/template-manager'

export const loader = async ({ context }: LoaderFunctionArgs) => {
    return context.availableTemplates
}
