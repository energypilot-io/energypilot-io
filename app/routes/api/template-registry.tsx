import { LoaderFunctionArgs } from 'react-router';

export const loader = async ({ context }: LoaderFunctionArgs) => {
    return {
        interfaces: context.interfaces,
        templates: context.templates,
    }
}
