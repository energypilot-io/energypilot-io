import { ComponentProps } from 'react'
import { ChartSpline, LayoutDashboard } from 'lucide-react'

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from '~/components/ui/sidebar'
import { SiDiscord, SiGithub } from '@icons-pack/react-simple-icons'
import { useTranslation } from 'react-i18next'

const footerMenuItems = [
    {
        href: 'https://discord.gg/2YQf3nTA',
        icon: <SiDiscord />,
        label: 'Discord',
    },

    {
        href: 'https://github.com/energypilot-io/energypilot-io',
        icon: <SiGithub />,
        label: 'Github',
    },
]

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
    const { t } = useTranslation()

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href="#">
                                <div className="flex aspect-square size-8 items-center justify-center">
                                    <img
                                        src="airplane_2708-fe0f.png"
                                        className="h-full"
                                    />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">
                                        {t('app.name')}
                                    </span>
                                    <span className="truncate text-xs">
                                        {t('app.version')}
                                    </span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>
                        {t('sidebar.platformGroup.title')}
                    </SidebarGroupLabel>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                                <a href="/">
                                    <LayoutDashboard />
                                    <span>{t('pages.dashboard.title')}</span>
                                </a>
                            </SidebarMenuButton>
                        </SidebarMenuItem>

                        <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                                <a href="/live">
                                    <ChartSpline />
                                    <span>{t('pages.liveData.title')}</span>
                                </a>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroup>

                <SidebarGroup className="mt-auto">
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {footerMenuItems.map((item, index) => (
                                <SidebarMenuItem key={index}>
                                    <SidebarMenuButton asChild size="sm">
                                        <a href={item.href} target="_blank">
                                            {item.icon}
                                            <span>{item.label}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter></SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}