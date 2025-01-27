import { LoaderFunctionArgs } from '@remix-run/node'

export const loader = async ({ context }: LoaderFunctionArgs) => {
    return context.availableTemplates
}
