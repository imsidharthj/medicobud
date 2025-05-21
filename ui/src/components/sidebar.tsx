import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { History, User2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarProvider, SidebarHeader, SidebarContent } from './ui/sidebar';
import { useEffect, useState } from "react";
import type React from "react";
import { useUser } from "@clerk/clerk-react";
import { FASTAPI_URL } from '@/utils/api';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  onLibraryClick: () => void;
  onPersonalInfoClick: () => void;
  activeView: 'doctor' | 'personal';
}

interface UserProfile {
  first_name: string;
  last_name: string;
  email?: string;
  date_of_birth?: string;
}

export function Sidebar({ className, onLibraryClick, onPersonalInfoClick, activeView }: SidebarProps) {
  const { user, isLoaded } = useUser();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
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
        
        const profileRes = await fetch(
          `${FASTAPI_URL}/api/profile/?email=${encodeURIComponent(email)}`
        );
        if (!profileRes.ok) throw new Error("Failed to fetch profile");
        const profileData_ = await profileRes.json();
        setProfileData(profileData_);

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
                  <Button
                    variant={activeView === 'personal' ? "blueButton" : "ghost"}
                    className="w-full justify-start gap-2 mb-2"
                    onClick={onPersonalInfoClick}
                  >
                    <User2 className="h-4 w-4" />
                    Personal Information
                  </Button>
                  
                  <Button
                    variant={activeView === 'doctor' ? "blueButton" : "ghost"}
                    className="w-full justify-start gap-2 mb-2"
                    onClick={onLibraryClick}
                  >
                    <History className="h-4 w-4" />
                    Library 
                  </Button>
                </SidebarContent>
              </div>
            </ScrollArea>
          </SidebarProvider>
        </div>
      </div>
    </div>
  );
}