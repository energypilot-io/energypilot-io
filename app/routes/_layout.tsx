import { Outlet } from 'react-router';
import { AppSidebar } from '~/components/energypilot/sidebar/app-sidebar'
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
