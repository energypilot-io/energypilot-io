import { SidebarTrigger } from '~/components/ui/sidebar'
import { ThemeToggleButton } from './theme-toggle-button'
import { Separator } from '@radix-ui/react-separator'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
} from '~/components/ui/breadcrumb'
import React, { ComponentPropsWithoutRef } from 'react'
import { LanguageToggleButton } from './language-toggle-button'

export type HeaderProps = ComponentPropsWithoutRef<'header'> & {
    breadcrumbs:
        | {
              link: string | undefined
              label: string
          }[]
        | undefined
}

export function Header({ className, breadcrumbs, ...props }: HeaderProps) {
    return (
        <header
            {...props}
            className={`flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-in-out group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 ${
                className !== undefined ? className : ''
            }`}
        >
            <div className="flex items-center gap-2 px-4 w-full">
                <SidebarTrigger className="-ml-1" />
                {breadcrumbs && (
                    <>
                        <Separator
                            orientation="vertical"
                            className="mr-2 h-4"
                        />
                        <Breadcrumb>
                            <BreadcrumbList>
                                {breadcrumbs.map((item, index) => {
                                    return (
                                        <React.Fragment key={index}>
                                            <BreadcrumbItem className="hidden md:block">
                                                <BreadcrumbLink
                                                    href={item.link}
                                                >
                                                    {item.label}
                                                </BreadcrumbLink>
                                            </BreadcrumbItem>
                                            {index < breadcrumbs.length - 1 ? (
                                                <BreadcrumbSeparator className="hidden md:block" />
                                            ) : null}
                                        </React.Fragment>
                                    )
                                })}
                            </BreadcrumbList>
                        </Breadcrumb>
                    </>
                )}
                <div className="flex grow justify-end">
                    <ThemeToggleButton />
                    <LanguageToggleButton />
                </div>
            </div>
        </header>
    )
}
