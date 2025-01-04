import { DE, GB } from 'country-flag-icons/react/3x2'

import { Button } from '../../ui/button'
import { useTranslation } from 'react-i18next'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { useSubmit } from '@remix-run/react'

export function LanguageToggleButton({
    ...props
}: React.ComponentProps<typeof Button>) {
    const { t, i18n } = useTranslation()

    const submit = useSubmit()

    function submitLanguage(language: string) {
        const formData = new FormData()
        formData.append('lng', language)
        submit(formData)
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    {...props}
                    variant="ghost"
                    size="icon"
                    onClick={() => null}
                >
                    {i18n.language === 'de' && (
                        <DE className="h-[1.2rem] w-[1.2rem]" />
                    )}
                    {i18n.language === 'en' && (
                        <GB className="h-[1.2rem] w-[1.2rem]" />
                    )}
                    <span className="sr-only">Toggle language</span>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => submitLanguage('en')}>
                    <GB className="h-[1.2rem] w-[1.2rem]" />
                    <span>English</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => submitLanguage('de')}>
                    <DE className="h-[1.2rem] w-[1.2rem]" />
                    <span>German</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
