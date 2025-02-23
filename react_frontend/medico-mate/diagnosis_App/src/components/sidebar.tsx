// import type React from "react"
// import { cn } from "@/lib/utils"
// import { Button } from "./ui/button"
// import { History, Heart, User2 } from "lucide-react"
// // import Link from "next/link"
// import { Link } from 'react-router-dom';
// import { usePathname } from "next/navigation"
// import { Sidebar as CustomSideBar, SidebarProvider, SidebarTrigger } from './ui/sidebar'
// interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

// export function Sidebar({ className }: SidebarProps) {
//   const pathname = usePathname()

//   return (
//     <SidebarProvider className="w-170">
//       <SidebarTrigger/>
//       <CustomSideBar className="mt-20">
//         <div className={cn("pb-12 w-74 border-r hidden md:block", className)}>
//           <div className="space-y-4 py-4">
//             <div className="px-3 py-2">
//               <div className="space-y-1">
//               <Link to="/profile">
//                   <Button 
//                     variant={pathname === "/profile" ? "secondary" : "ghost"}
//                     className="w-full justify-start gap-2 mb-[8px]"
//                   >
//                     <User2 className="h-4 w-4" />
//                     Personal Information
//                   </Button>
//                 </Link>
//                 <Link to="/history">
//                 <Button 
//                     variant={pathname === "/profile" ? "secondary" : "ghost"}
//                     className="w-full justify-start gap-2 mb-[8px]"
//                   >
//                     <User2 className="h-4 w-4" />
//                     History
//                   </Button>
//                 </Link>
//                 <Link to="/favorites">
//                 <Button 
//                     variant={pathname === "/profile" ? "secondary" : "ghost"}
//                     className="w-full justify-start gap-2 mb-[8px]"
//                   >
//                     <User2 className="h-4 w-4" />
//                     Favorites
//                   </Button>
//                 </Link>
//               </div>
//             </div>
//           </div>
//         </div>
//       </CustomSideBar>
//     </SidebarProvider>
//   )
// }



import type React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { History, Heart, User2, Settings } from "lucide-react"
import { Link } from "react-router-dom"
import { useLocation } from "react-router-dom"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation()

  return (
    <div className={cn("pb-12 w-74 shadow-lg rounded-2xl hidden md:block", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <Card>
            <CardHeader className="pb-4 bg-blue-500">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src="/placeholder-user.jpg" alt="User" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-1xl text-white font-bold">User</CardTitle>
                  {/* <CardDescription>Premium Member</CardDescription> */}
                </div>
              </div>
            </CardHeader>
          </Card>

          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-1 py-2">
              <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Menu</h2>
              <Link to="/profile">
                <Button
                  variant={location.pathname === "/profile" ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2 mb-2"
                >
                  <User2 className="h-4 w-4" />
                  Personal Information
                </Button>
              </Link>
              <Link to="/history">
                <Button
                  variant={location.pathname === "/history" ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2 mb-2"
                >
                  <History className="h-4 w-4" />
                  History
                </Button>
              </Link>
              <Link to="/favorites">
                <Button
                  variant={location.pathname === "/favorites" ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2 mb-2"
                >
                  <Heart className="h-4 w-4" />
                  Favorites
                </Button>
              </Link>
              <Link to="/settings">
                <Button
                  variant={location.pathname === "/settings" ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </Link>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}