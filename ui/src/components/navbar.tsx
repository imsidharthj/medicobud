// import Link from "next/link"
import { Link } from 'react-router-dom';
// import { Button } from "./ui/button"
import { Menu, X } from "lucide-react"
import { useState } from 'react';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-20 items-center justify-between md:ml-25 max-w-7xl md:mr-40">
          {/* Logo */}
          <Link to="/" className="flex items-center font-bold text-xl text-blue-500">
            <div className="w-12 h-12 text-blue-500 mt-2">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
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
            <Link to="/diagnosis" className="text-lg hover:text-blue-600 transition-colors">
              Diagnosis
            </Link>
            <Link to="/medical-care" className="text-lg hover:text-blue-600 transition-colors">
              Medical Library
            </Link>
            {/* <Link to="/products" className="text-sm font-medium hover:text-blue-600 transition-colors">
              Medical Products
            </Link> */}
            <Link to="/about" className="text-lg hover:text-blue-600 transition-colors">
              About us
            </Link>
          </nav>

          {/* Desktop Buttons */}
          {/* <div className="hidden lg:flex items-center gap-4">
            <Button asChild variant="ghost">
              <Link to="/login">Sign in</Link>
            </Button>
          </div> */}
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 px-2 space-y-4">
            <nav className="flex flex-col space-y-4">
              <Link to="/diagnosis" className="text-sm font-medium hover:text-blue-600 transition-colors" onClick={() => setIsMenuOpen(false)}>
                Diagnosis
              </Link>
              <Link to="/medical-care" className="text-sm font-medium hover:text-blue-600 transition-colors" onClick={() => setIsMenuOpen(false)}>
                Medical Care
              </Link>
              <Link to="/about" className="text-sm font-medium hover:text-blue-600 transition-colors" onClick={() => setIsMenuOpen(false)}>
                About
              </Link>
            </nav>
            {/* <div className="flex flex-col space-y-2">
              <Button asChild variant="ghost" onClick={() => setIsMenuOpen(false)}>
                <Link to="/login">Sign in</Link>
              </Button>
            </div> */}
          </div>
        )}
      </div>
    </header>
  )
}