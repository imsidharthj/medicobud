import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User, UserPlus, LogIn, Stethoscope, ArrowRight, Loader2 } from 'lucide-react';
import { SignInButton, SignUpButton, SignedOut } from '@clerk/clerk-react';

interface DiagnosisStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueAsGuest: () => Promise<void>; // Expecting an async function that might throw
}

export const DiagnosisStartModal: React.FC<DiagnosisStartModalProps> = ({
  isOpen,
  onClose,
  onContinueAsGuest,
}) => {
  const redirectUrl = typeof window !== 'undefined' ? window.location.pathname : '/';
  const [sessionLimitError, setSessionLimitError] = useState<string | null>(null);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const handleModalClose = () => {
    setSessionLimitError(null); // Reset error on close
    setIsGuestLoading(false); // Reset loading state
    onClose();
  };

  const handleGuestContinue = async () => {
    setIsGuestLoading(true);
    setSessionLimitError(null);
    try {
      await onContinueAsGuest();
      // If successful, the parent's onContinueAsGuest should handle navigation/state,
      // and we can close this modal.
      handleModalClose();
    } catch (error: any) {
      if (error && error.status === 429) {
        setSessionLimitError(error.message || 'Daily session limit reached. Please sign in or create an account.');
      } else {
        console.error('Error continuing as guest:', error);
        setSessionLimitError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-3">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          {!sessionLimitError && (
            <>
              <DialogTitle className="text-center text-xl font-semibold">
                Start Health Analysis
              </DialogTitle>
              <DialogDescription className="text-center text-sm text-gray-500 pt-1">
                Choose how you'd like to proceed.
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        {sessionLimitError ? (
          <div className="py-4 space-y-4">
            <DialogTitle className="text-center text-xl font-semibold text-red-500">
              Session Limit Reached
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-gray-600 dark:text-gray-400 pt-1">
              {sessionLimitError}
            </DialogDescription>
            <div className="pt-2 space-y-3">
              <SignedOut>
                <SignInButton mode="modal" forceRedirectUrl={redirectUrl}>
                  <Button
                    variant="popup"
                    className="w-full justify-start h-auto py-3"
                    onClick={handleModalClose} // Close this modal when Clerk modal opens
                  >
                    <LogIn className="mr-3 h-5 w-5" />
                    <div className="text-left">
                      <span className="font-medium">Sign In</span>
                    </div>
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal" forceRedirectUrl={redirectUrl}>
                  <Button
                    variant="popup"
                    className="w-full justify-start h-auto py-3"
                    onClick={handleModalClose} // Close this modal when Clerk modal opens
                  >
                    <UserPlus className="mr-3 h-5 w-5" />
                    <div className="text-left">
                      <span className="font-medium">Create Account</span>
                    </div>
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </Button>
                </SignUpButton>
              </SignedOut>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-3">
            <Button
              variant="popup"
              className="w-full justify-start h-auto py-3"
              onClick={handleGuestContinue}
              disabled={isGuestLoading}
            >
              {isGuestLoading ? (
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              ) : (
                <User className="mr-3 h-5 w-5" />
              )}
              <div className="text-left">
                <span className="font-medium">Continue as Guest</span>
                <p className="text-xs text-gray-500 dark:text-gray-600">
                  No account needed, quick start.
                </p>
              </div>
              {!isGuestLoading && <ArrowRight className="ml-auto h-4 w-4" />}
            </Button>

            <div className="flex items-center my-3">
              <div className="flex-1 border-t border-gray-300 dark:border-gray-700" />
              <span className="px-3 text-xs uppercase text-gray-500 dark:text-gray-400">Or</span>
              <div className="flex-1 border-t border-gray-300 dark:border-gray-700" />
            </div>

            <SignedOut>
              <SignInButton mode="modal" forceRedirectUrl={redirectUrl}>
                <Button
                  variant="popup"
                  className="w-full justify-start h-auto py-3"
                  onClick={handleModalClose} // Close this modal when Clerk modal opens
                >
                  <LogIn className="mr-3 h-5 w-5" />
                  <div className="text-left">
                    <span className="font-medium">Sign In</span>
                    <p className="text-xs text-gray-500 dark:text-gray-600">
                      Access saved history & full features.
                    </p>
                  </div>
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Button>
              </SignInButton>

              <SignUpButton mode="modal" forceRedirectUrl={redirectUrl}>
                <Button
                  variant="popup"
                  className="w-full justify-start h-auto py-3"
                  onClick={handleModalClose} // Close this modal when Clerk modal opens
                >
                  <UserPlus className="mr-3 h-5 w-5" />
                  <div className="text-left">
                    <span className="font-medium">Create Account</span>
                    <p className="text-xs text-gray-500 dark:text-gray-600">
                      Unlock all features.
                    </p>
                  </div>
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Button>
              </SignUpButton>
            </SignedOut>
          </div>
        )}
        <DialogFooter className="sm:justify-start mt-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center w-full">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};