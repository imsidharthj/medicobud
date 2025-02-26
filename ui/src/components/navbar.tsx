// import Link from "next/link"
import { Link } from 'react-router-dom';
import { Button } from "./ui/button"
import { Activity, Menu, X } from "lucide-react"
import { useState } from 'react';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-[#1576d1]">
            <Activity className="h-6 w-6" />
            MedicoMate
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
            <Link to="/diagnosis" className="text-sm font-medium hover:text-blue-600 transition-colors">
              Diagnosis
            </Link>
            <Link to="/medical-care" className="text-sm font-medium hover:text-blue-600 transition-colors">
              Medical care
            </Link>
            <Link to="/products" className="text-sm font-medium hover:text-blue-600 transition-colors">
              Medical Products
            </Link>
            <Link to="/about" className="text-sm font-medium hover:text-blue-600 transition-colors">
              About
            </Link>
          </nav>

          {/* Desktop Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <Button asChild variant="ghost">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/diagnosis">Take a Diagnosis</Link>
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 px-2 space-y-4">
            <nav className="flex flex-col space-y-4">
              <Link 
                to="/diagnosis" 
                className="text-sm font-medium hover:text-blue-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Diagnosis
              </Link>
              <Link 
                to="/medical-care"
                className="text-sm font-medium hover:text-blue-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Medical Care
              </Link>
              <Link 
                to="/products" 
                className="text-sm font-medium hover:text-blue-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Medical Products
              </Link>
              <Link 
                to="/about" 
                className="text-sm font-medium hover:text-blue-600 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
            </nav>
            <div className="flex flex-col space-y-2">
              <Button asChild variant="ghost" onClick={() => setIsMenuOpen(false)}>
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild variant="ghost" onClick={() => setIsMenuOpen(false)}>
                <Link to="/diagnosis">Take a Diagnosis</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}