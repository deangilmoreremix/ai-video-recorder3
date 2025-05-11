import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Brain, Film, Download, Mail, Twitter, Youtube, Instagram, Github, Linkedin, Facebook } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Logo and Tagline */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center">
              <span className="font-bold text-2xl text-transparent bg-clip-text bg-gradient-to-r from-[#E44E51] to-[#D43B3E]">
                AI Screen Recorder
              </span>
            </Link>
            <p className="mt-4 text-gray-400">
              Transform your video creation with advanced AI features, real-time enhancements, and professional editing tools.
            </p>
            <div className="mt-6 flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
                <span className="sr-only">Twitter</span>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Youtube className="w-5 h-5" />
                <span className="sr-only">YouTube</span>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
                <span className="sr-only">Instagram</span>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Github className="w-5 h-5" />
                <span className="sr-only">GitHub</span>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
                <span className="sr-only">LinkedIn</span>
              </a>
            </div>
          </div>
          
          {/* Features */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase">Features</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link to="/features/ai" className="text-gray-400 hover:text-white transition-colors">
                  AI Features
                </Link>
              </li>
              <li>
                <Link to="/features/recorder" className="text-gray-400 hover:text-white transition-colors">
                  Video Recorder
                </Link>
              </li>
              <li>
                <Link to="/features/editor" className="text-gray-400 hover:text-white transition-colors">
                  Video Editor
                </Link>
              </li>
              <li>
                <Link to="/features/export" className="text-gray-400 hover:text-white transition-colors">
                  Export Options
                </Link>
              </li>
              <li>
                <Link to="/features/animation" className="text-gray-400 hover:text-white transition-colors">
                  GIFs & Thumbnails
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase">Resources</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Tutorials
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  API Reference
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Changelog
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Blog
                </a>
              </li>
            </ul>
          </div>
          
          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase">Company</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
          
          {/* Newsletter */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase">Stay Updated</h3>
            <p className="mt-4 text-gray-400">Subscribe to our newsletter for the latest updates</p>
            <form className="mt-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="min-w-0 flex-auto rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-[#E44E51] sm:text-sm sm:leading-6"
                  required
                />
                <button
                  type="submit"
                  className="flex-none rounded-md bg-[#E44E51] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#D43B3E]"
                >
                  Subscribe
                </button>
              </div>
            </form>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-sm text-gray-400 text-center">
            &copy; {new Date().getFullYear()} AI Screen Recorder. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;