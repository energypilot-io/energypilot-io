import { Outlet } from '@remix-run/react'
import { AppSidebar } from '~/components/energypilot/ui/sidebar/app-sidebar'
import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar'

export default function Layout() {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <Outlet />
            </SidebarInset>
        </SidebarProvider>
    )
}
