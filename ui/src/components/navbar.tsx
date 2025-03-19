import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from "lucide-react";
import { useState } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navItem = [
    { path: '/diagnosis', label: 'Diagnosis' },
    { path: '/medical-care', label: 'Medical Library' },
    { path: '/about', label: 'About' }
  ];

  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between md:ml-25 max-w-7xl md:mr-40">
          {/* Logo */}
          <Link to="/" className="flex items-center font-bold text-xl text-blue-500">
            <div className="w-12 h-12 text-blue-500 mt-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
              >
                <circle cx="12" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
                <line x1="12" y1="6" x2="12" y2="12" stroke="currentColor" strokeWidth="2" />
                <line x1="9" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            Medicobud
          </Link>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {navItem.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-lg transition-colors ${
                  isActive(item.path)
                    ? 'text-blue-600 font-semibold'
                    : 'hover:text-blue-600'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <nav>
            <SignedOut>
              <SignInButton />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </nav>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 space-y-4">
            <nav className="flex flex-col space-y-4">
              {navItem.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'text-blue-600 font-semibold'
                      : 'hover:text-blue-600'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
