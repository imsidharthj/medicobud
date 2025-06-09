import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
// import ProfileCompletionModal from './ProfileCompletionModal';
import ProfileCompletionModal from './form/ProfileComplete-form';
import { FASTAPI_URL } from './utils/api';
import { tempUserService } from './utils/tempUser';

interface AuthContextType {
  isProfileComplete: boolean;
  checkProfileStatus: () => Promise<void>;
  isTempUser: boolean;
  tempUserId: string | null;
  clearTempUserData: () => Promise<void>;
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
    await tempUserService.clearTempUser();
    setIsTempUser(false);
    setTempUserId(null);
  };

  // Initialize temporary user management
  useEffect(() => {
    const initializeTempUser = async () => {
      if (!isSignedIn) {
        // User is not logged in, check if we have a temp user ID
        const existingTempUserId = tempUserService.getTempUserId();
        if (existingTempUserId) {
          setTempUserId(existingTempUserId);
          setIsTempUser(true);
        } else {
          // Create a new temporary user
          try {
            const newTempUserId = await tempUserService.createTempUser();
            setTempUserId(newTempUserId);
            setIsTempUser(true);
            console.log("Created new temporary user:", newTempUserId);
          } catch (error) {
            console.error("Failed to create temporary user:", error);
          }
        }
      } else {
        // User is logged in, clear any temporary user data
        if (tempUserService.isTempUser()) {
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
      clearTempUserData 
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