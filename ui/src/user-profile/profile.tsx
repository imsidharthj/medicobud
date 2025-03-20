import { Link } from 'react-router-dom';
import { UserCircle, Lock } from 'lucide-react'
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

interface Metadata {
  title?: string;
  description?: string;
  keywords?: string[];
}

export const metadata: Metadata = {
  title: "Settings",
  description: "Account settings and preferences.",
}

const sidebarNavItems = [
  {
    title: "Personal Information",
    href: "/settings",
    icon: UserCircle,
  },
  {
    title: "Password & Security",
    href: "/settings/security",
    icon: Lock,
  },
]

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="container grid flex-1 gap-12 md:grid-cols-[200px_1fr] py-8">
      <aside className="hidden w-[200px] flex-col md:flex">
        <nav className="grid items-start gap-2">
          {sidebarNavItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "justify-start gap-2"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.title}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex w-full flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
