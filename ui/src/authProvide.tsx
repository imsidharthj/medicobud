import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
// import ProfileCompletionModal from './ProfileCompletionModal';
import ProfileCompletionModal from './form/ProfileComplete-form';
import { FASTAPI_URL } from './utils/api';

interface AuthContextType {
  isProfileComplete: boolean;
  checkProfileStatus: () => Promise<void>;
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
    <AuthContext.Provider value={{ isProfileComplete, checkProfileStatus }}>
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