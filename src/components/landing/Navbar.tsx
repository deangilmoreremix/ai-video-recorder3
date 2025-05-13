import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);
  
  useEffect(() => {
    // Close the mobile menu when route changes
    setIsMenuOpen(false);
  }, [location]);

  return (
    <header className={`sticky top-0 z-50 ${isScrolled ? 'bg-white shadow-md' : 'bg-transparent'} transition-all duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <span className="font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-[#E44E51] to-[#D43B3E]">
                AI Screen Recorder
              </span>
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="flex items-center space-x-8">
              <Link
                to="/"
                className={`text-${isScrolled ? 'gray-900' : 'white'} hover:text-[#E44E51] px-3 py-2 text-sm font-medium transition-colors duration-200`}
              >
                Home
              </Link>
              
              <div className="relative group">
                <button
                  onClick={() => setIsSubmenuOpen(!isSubmenuOpen)}
                  onMouseEnter={() => setIsSubmenuOpen(true)}
                  className={`text-${isScrolled ? 'gray-900' : 'white'} hover:text-[#E44E51] px-3 py-2 text-sm font-medium flex items-center transition-colors duration-200`}
                >
                  Features
                  <ChevronDown className={`ml-1 w-4 h-4 transition-transform duration-200 ${isSubmenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <div
                  className={`absolute left-0 mt-1 w-56 rounded-md shadow-lg ${isScrolled ? 'bg-white' : 'bg-white'} ring-1 ring-black ring-opacity-5 focus:outline-none z-50 ${isSubmenuOpen ? 'block' : 'hidden'}`}
                  onMouseEnter={() => setIsSubmenuOpen(true)}
                  onMouseLeave={() => setIsSubmenuOpen(false)}
                >
                  <div className="py-1">
                    <Link to="/features/ai" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      AI Features
                    </Link>
                    <Link to="/features/recorder" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Video Recorder
                    </Link>
                    <Link to="/features/editor" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Video Editor
                    </Link>
                    <Link to="/features/export" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Export Options
                    </Link>
                    <Link to="/features/animation" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      GIFs & Thumbnails
                    </Link>
                  </div>
                </div>
              </div>
              
              <a
                href="#"
                className={`text-${isScrolled ? 'gray-900' : 'white'} hover:text-[#E44E51] px-3 py-2 text-sm font-medium transition-colors duration-200`}
              >
                Pricing
              </a>
              
              <a
                href="#"
                className={`text-${isScrolled ? 'gray-900' : 'white'} hover:text-[#E44E51] px-3 py-2 text-sm font-medium transition-colors duration-200`}
              >
                Contact
              </a>
            </div>
          </div>
          
          <div className="hidden md:block">
            <Link
              to="/app"
              className={`rounded px-4 py-2 text-sm font-medium ${
                isScrolled 
                  ? 'bg-[#E44E51] text-white hover:bg-[#D43B3E]' 
                  : 'bg-white text-[#E44E51] hover:bg-gray-100'
              } transition-colors duration-200`}
            >
              Try Free
            </Link>
          </div>
          
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`inline-flex items-center justify-center p-2 rounded-md text-${isScrolled ? 'gray-900' : 'white'} hover:text-[#E44E51] focus:outline-none`}
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link
                to="/"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 hover:bg-gray-50"
              >
                Home
              </Link>
              
              <div>
                <button
                  onClick={() => setIsSubmenuOpen(!isSubmenuOpen)}
                  className="flex justify-between items-center w-full px-3 py-2 rounded-md text-base font-medium text-gray-900 hover:bg-gray-50"
                >
                  <span>Features</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isSubmenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isSubmenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <div className="pl-4 space-y-1 bg-gray-50 rounded-md mx-3 py-2 mt-1">
                        <Link to="/features/ai" className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 hover:bg-gray-100">
                          AI Features
                        </Link>
                        <Link to="/features/recorder" className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 hover:bg-gray-100">
                          Video Recorder
                        </Link>
                        <Link to="/features/editor" className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 hover:bg-gray-100">
                          Video Editor
                        </Link>
                        <Link to="/features/export" className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 hover:bg-gray-100">
                          Export Options
                        </Link>
                        <Link to="/features/animation" className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 hover:bg-gray-100">
                          GIFs & Thumbnails
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <a
                href="#"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 hover:bg-gray-50"
              >
                Pricing
              </a>
              
              <a
                href="#"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 hover:bg-gray-50"
              >
                Contact
              </a>
              
              <Link
                to="/app"
                className="block px-3 py-2 rounded-md text-base font-medium bg-[#E44E51] text-white hover:bg-[#D43B3E] mt-2"
              >
                Try Free
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;