import { Link, Outlet } from "react-router-dom";
import { UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useState, createContext, useContext } from "react";
import { FASTAPI_URL } from "@/utils/api";

interface UserProfile {
  first_name: string;
  last_name: string;
  email?: string;
  date_of_birth?: string;
  gender?: string;
  weight?: number;
  allergies?: string[];
}

interface ProfileContextType {
  profileData: UserProfile | null;
  loading: boolean;
  error: string | null;
  refetchProfile: () => void;
  updateProfile: (field: string, value: any) => Promise<boolean>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

const sidebarNavItems = [
  {
    title: "Personal Information",
    href: "/user-profile/personal-information",
    icon: UserCircle,
  },
  // {
  //   title: "Password & Security",
  //   href: "/user-profile/password-security",
  //   icon: Lock,
  // },
];

export default function SettingsLayout() {
  const { user, isLoaded } = useUser();
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!isLoaded || !user) {
      setLoading(false);
      return;
    }

    const email = user?.emailAddresses[0]?.emailAddress;
    if (!email) {
      return;
    }

    try {
      setLoading(true);

      const profileRes = await fetch(
        `${FASTAPI_URL}/api/profile/?email=${encodeURIComponent(email)}`
      );
      if (!profileRes.ok) throw new Error("Failed to fetch profile");
      const profileData_ = await profileRes.json();
      console.log("Fetched profile data:", profileData_);
      setProfileData(profileData_);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, isLoaded]);

  const updateProfile = async (field: string, value: any): Promise<boolean> => {
    if (!isLoaded || !user) {
      return false;
    }

    const email = user?.emailAddresses[0]?.emailAddress;
    if (!email) {
      return false;
    }

    try {
      const currentAllergies = profileData?.allergies;
      const allergiesValue = field === 'allergies'
        ? (Array.isArray(value) ? (value.length > 0 ? value.join(',') : null) : value)
        : (Array.isArray(currentAllergies) ? (currentAllergies.length > 0 ? currentAllergies.join(',') : null) : currentAllergies);

      const response = await fetch(
        `${FASTAPI_URL}/api/profile/update?email=${encodeURIComponent(email)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            first_name: field === 'first_name' ? value : profileData?.first_name,
            last_name: field === 'last_name' ? value : profileData?.last_name,
            date_of_birth: field === 'date_of_birth' ? value : profileData?.date_of_birth,
            gender: field === 'gender' ? value : profileData?.gender,
            weight: field === 'weight' ? value : profileData?.weight,
            allergies: allergiesValue,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to update profile:", errorData);
        throw new Error(`Failed to update profile: ${errorData.detail || response.statusText}`);
      }

      const updatedProfile = await response.json();
      // Ensure allergies in local state is an array after update
      if (updatedProfile && typeof updatedProfile.allergies === 'string') {
        updatedProfile.allergies = updatedProfile.allergies.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      } else if (updatedProfile && updatedProfile.allergies === null) {
        updatedProfile.allergies = [];
      }
      
      setProfileData((prev) => (prev ? { ...prev, ...updatedProfile } : updatedProfile));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error during update");
      return false;
    }
  };

  const contextValue: ProfileContextType = {
    profileData,
    loading,
    error,
    refetchProfile: fetchData,
    updateProfile,
  };

  return (
    <ProfileContext.Provider value={contextValue}>
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
          <Outlet />
        </main>
      </div>
    </ProfileContext.Provider>
  );
}
