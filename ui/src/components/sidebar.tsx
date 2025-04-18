import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { History, Heart, User2, Settings } from "lucide-react"
import { useLocation, Link } from "react-router-dom"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SidebarProvider, SidebarHeader, SidebarContent, SidebarFooter } from './ui/sidebar';
// import { useAuth, useUser } from "@clerk/clerk-react"
// import axios from "axios"
import { useEffect, useState } from "react"
import type React from "react"
// import { number } from "zod"
import { useUser } from "@clerk/clerk-react"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

interface UserProfile {
  first_name: string
  last_name: string
  email?: string
  date_of_birth?: string
}

interface userDiagnosis{
  id?: number
  symptoms: string[]
  predicted_disease: string[]
  timestamp?: string
}

export function Sidebar({ className }: SidebarProps) {
  const location = useLocation()
  const { user, isLoaded } = useUser();
  const [profileData, setProfileData] = useState<UserProfile | null>(null)
  const [diagnosisHistoryData, setDiagnosisHistoryData] = useState<userDiagnosis[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    if (!isLoaded || !user) {
      setLoading(false);
      return;
    }

    const email = user?.emailAddresses[0]?.emailAddress;
    if (!email) {
      setError("No email found for user");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch profile data
        const profileRes = await fetch(
          `http://localhost:8000/api/profile/?email=${encodeURIComponent(email)}`
        );
        if (!profileRes.ok) throw new Error("Failed to fetch profile");
        const profileData_ = await profileRes.json();
        setProfileData(profileData_);
        console.log(profileData_)

        // Fetch diagnosis history
        const historyRes = await fetch(
          `http://localhost:8000/api/diagnosis/history?email=${encodeURIComponent(email)}`
        );
        if (!historyRes.ok) throw new Error("Failed to fetch history");
        const historyData = await historyRes.json();
        setDiagnosisHistoryData(historyData);
        console.log(diagnosisHistoryData)

      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isLoaded]);

  if (!isLoaded || loading) {
    return <div className="p-4">Loading user data...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  if (!user) {
    return <div className="p-4">Please sign in to view your profile</div>;
  }

  return (
    <div
      className={cn(
        "h-screen w-72 border-r border-gray-200 bg-white shadow-lg hidden md:flex flex-col",
        className
      )}
    >
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <Card>
            <CardHeader className="pb-4 bg-[#1576d1]">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src="/placeholder-user.jpg" alt="User" />
                  <AvatarFallback>{profileData?.first_name?.[0]}{profileData?.last_name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-1xl text-white font-bold">{profileData?.first_name} {profileData?.last_name}</CardTitle>
                  {/* <CardDescription>{profileData?.email || "Premium Member"}</CardDescription> */}
                </div>
              </div>
            </CardHeader>
          </Card>

          <SidebarProvider>
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-1 py-2">
              <SidebarHeader>
              <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Menu</h2>
              </SidebarHeader>
              <SidebarContent>
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
                  History ({diagnosisHistoryData?.length || 0})
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
              <div className="px-4 space-y-2">
                {diagnosisHistoryData.slice(0, 3).map((diagnosis) => (
                  <div key={diagnosis.id} className="text-sm p-2 bg-gray-100 rounded">
                    <p className="font-medium">{diagnosis.predicted_disease.join(", ") || 'No diagnosis'}</p>
                    <p className="text-xs text-gray-500">
                      {diagnosis.timestamp ? new Date(diagnosis.timestamp).toLocaleDateString() : 'No date available'}
                    </p>
                  </div>
                ))}
              </div>
              </SidebarContent>
              <SidebarFooter>
                <Link to="/settings">
                  <Button
                    variant={location.pathname === "/settings" ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                </Link>
              </SidebarFooter>
            </div>
          </ScrollArea>
          </SidebarProvider>
        </div>
      </div>
    </div>
  )
}