import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { User, UserPlus, LogIn, Stethoscope, ArrowRight } from 'lucide-react';

interface DiagnosisStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueAsGuest: () => void;
}

export const DiagnosisStartModal: React.FC<DiagnosisStartModalProps> = ({
  isOpen,
  onClose,
  onContinueAsGuest,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-3">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <DialogTitle className="text-center text-xl font-semibold">Start Health Analysis</DialogTitle>
          <DialogDescription className="text-center text-sm text-gray-500 pt-1">
            Choose how you'd like to proceed.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-3 hover:bg-green-50 hover:border-green-400"
            onClick={() => {
              onContinueAsGuest();
              onClose();
            }}
          >
            <User className="mr-3 h-5 w-5 text-green-600" />
            <div className="text-left">
              <span className="font-medium text-gray-800">Continue as Guest</span>
              <p className="text-xs text-gray-500">No account needed, quick start.</p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 text-gray-400" />
          </Button>

          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button variant="default" className="w-full justify-start h-auto py-3" asChild>
            <Link to="/sign-in" onClick={onClose}>
              <LogIn className="mr-3 h-5 w-5" />
              <div className="text-left">
                <span className="font-medium">Sign In</span>
                <p className="text-xs text-blue-100">Access saved history & full features.</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-blue-200" />
            </Link>
          </Button>
          <Button variant="outline" className="w-full justify-start h-auto py-3" asChild>
            <Link to="/sign-up" onClick={onClose}>
              <UserPlus className="mr-3 h-5 w-5" />
               <div className="text-left">
                <span className="font-medium text-gray-800">Create Account</span>
                <p className="text-xs text-gray-500">Unlock all features.</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-gray-400" />
            </Link>
          </Button>
        </div>
         <DialogFooter className="sm:justify-start mt-2">
            <p className="text-xs text-gray-500 text-center w-full">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};