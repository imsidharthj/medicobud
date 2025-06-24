import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
// import ProfileCompletionModal from './ProfileCompletionModal';
import ProfileCompletionModal from './form/ProfileComplete-form';
import { FASTAPI_URL } from './utils/api';
import { tempUserService, FeatureType } from './utils/tempUser';

interface AuthContextType {
  isProfileComplete: boolean;
  checkProfileStatus: () => Promise<void>;
  isTempUser: boolean;
  tempUserId: string | null;
  clearTempUserData: () => Promise<void>;
  getTempUserStats: () => Promise<any>;
  canUseFeature: (feature: FeatureType) => Promise<boolean>;
  getRemainingLimits: () => Promise<Record<string, any>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isSignedIn } = useUser();
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(true);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [isTempUser, setIsTempUser] = useState<boolean>(false);
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  
  const checkProfileStatus = async () => {
    if (!isSignedIn || !user?.primaryEmailAddress) {
      console.log("User not signed in or no email available");
      return;
    }
    
    const email = user?.emailAddresses[0]?.emailAddress;
    console.log("Checking profile status for:", email);
    
    try {
      const response = await fetch(`${FASTAPI_URL}/api/auth/verify?email=${encodeURIComponent(email)}`);
      console.log("Profile status request URL:", `${FASTAPI_URL}/api/auth/verify?email=${encodeURIComponent(email)}`);
      console.log("Profile status response:", response.status);
      
      if (!response.ok) {
        console.error("Error response:", await response.text());
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Profile data:", data);
      
      setIsProfileComplete(data.profile_complete);
      
      if (!data.profile_complete) {
        setMissingFields(data.missing_fields);
        setShowProfileModal(true);
        console.log("Profile incomplete, showing modal. Missing fields:", data.missing_fields);
      }
    } catch (error) {
      console.error("Error checking profile status:", error);
    }
  };

  const clearTempUserData = async () => {
    try {
      await tempUserService.clearTempUser();
      setIsTempUser(false);
      setTempUserId(null);
      console.log("✅ Temporary user data cleared");
    } catch (error) {
      console.error("❌ Failed to clear temp user data:", error);
    }
  };

  const getTempUserStats = async () => {
    if (!isTempUser) return null;
    try {
      return await tempUserService.getTempUserStats();
    } catch (error) {
      console.error("Failed to get temp user stats:", error);
      return null;
    }
  };

  const canUseFeature = async (feature: FeatureType): Promise<boolean> => {
    if (!isTempUser) return true; // Authenticated users have unlimited access
    try {
      return await tempUserService.canUseFeature(feature);
    } catch (error) {
      console.error(`Failed to check feature access for ${feature}:`, error);
      return false;
    }
  };

  const getRemainingLimits = async (): Promise<Record<string, any>> => {
    if (!isTempUser) return {}; // Authenticated users have unlimited access
    try {
      return await tempUserService.getRemainingLimits();
    } catch (error) {
      console.error("Failed to get remaining limits:", error);
      return {};
    }
  };

  // Initialize temporary user management with new universal system
  useEffect(() => {
    const initializeTempUser = async () => {
      if (!isSignedIn) {
        // User is not logged in - initialize temp user system
        try {
          const existingTempUserId = await tempUserService.getTempUserId();
          if (existingTempUserId) {
            setTempUserId(existingTempUserId);
            setIsTempUser(true);
            console.log("🎯 Using existing temp user:", existingTempUserId);
            
            // Get user stats for debugging
            const stats = await tempUserService.getTempUserStats();
            console.log("📊 Temp user stats:", stats);
          } else {
            // This shouldn't happen as tempUserService auto-creates users
            console.warn("⚠️ No temp user ID available after initialization");
          }
        } catch (error) {
          console.error("❌ Failed to initialize temporary user:", error);
        }
      } else {
        // User is logged in - clear any temporary user data
        if (tempUserService.isTempUser()) {
          console.log("🔄 User logged in, clearing temp user data");
          await clearTempUserData();
        }
        setIsTempUser(false);
        setTempUserId(null);
      }
    };

    initializeTempUser();
  }, [isSignedIn]);
  
  useEffect(() => {
    console.log("AuthProvider effect running, isSignedIn:", isSignedIn);
    if (isSignedIn) {
      checkProfileStatus();
    }
  }, [isSignedIn, user?.id]);
  
  const handleProfileComplete = () => {
    console.log("Profile completed");
    setIsProfileComplete(true);
    setShowProfileModal(false);
  };
  
  return (
    <AuthContext.Provider value={{ 
      isProfileComplete, 
      checkProfileStatus, 
      isTempUser, 
      tempUserId,
      clearTempUserData,
      getTempUserStats,
      canUseFeature,
      getRemainingLimits
    }}>
      {children}
      
      {showProfileModal && user?.primaryEmailAddress && (
        <ProfileCompletionModal
          email={user.primaryEmailAddress.emailAddress}
          missingFields={missingFields}
          onComplete={handleProfileComplete}
        />
      )}
    </AuthContext.Provider>
  );
}