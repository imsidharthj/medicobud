import { ReactNode } from "react";
import { Protect, useAuth, RedirectToSignIn } from "@clerk/clerk-react";
import { useLocation } from "react-router-dom";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <Protect
      fallback={
        <>
          {!isLoaded && (
            <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-lg font-semibold text-gray-700">
                Verifying your session...
              </p>
            </div>
          )}
          {isLoaded && !isSignedIn && (
            <>
              <div className="w-full flex flex-col items-center justify-center min-h-screen text-center p-4">
                <p className="text-lg font-semibold text-red-600 mb-2">
                  Authentication Required
                </p>
                <p className="text-md text-gray-700 mb-4">
                  You are signed out. To access this service, you need to sign in.
                </p>
                <p className="text-sm text-gray-500">
                  Redirecting to the sign-in page...
                </p>
              </div>
              <RedirectToSignIn redirectUrl={location.pathname + location.search + location.hash} />
            </>
          )}
        </>
      }
    >
      {children}
    </Protect>
  );
}