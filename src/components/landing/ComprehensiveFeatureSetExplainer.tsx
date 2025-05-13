import React from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronRight, Search, Filter, Grid, Layout, Brain, 
  Video, Scissors, Download, Sparkles, Camera, Trash2, 
  ArrowRight, Layers
} from 'lucide-react';

const ComprehensiveFeatureSetExplainer = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-8 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left column - Explanation */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-2xl font-bold text-gray-900">How to Use the Feature Explorer</h3>
              <p className="mt-3 text-lg text-gray-600">
                Our Comprehensive Feature Set section lets you explore all capabilities of the AI Screen Recorder platform. Here's how to use it:
              </p>
            </motion.div>

            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="flex items-start">
                <div className="mt-1 flex-shrink-0 h-6 w-6 rounded-full bg-[#E44E51]/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-[#E44E51]">1</span>
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-gray-900">Browse Feature Categories</h4>
                  <p className="mt-1 text-gray-600">Click on any category header to expand and see all features within that category.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="mt-1 flex-shrink-0 h-6 w-6 rounded-full bg-[#E44E51]/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-[#E44E51]">2</span>
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-gray-900">Explore Features</h4>
                  <p className="mt-1 text-gray-600">Hover over any feature card to learn more about its capabilities and benefits.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="mt-1 flex-shrink-0 h-6 w-6 rounded-full bg-[#E44E51]/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-[#E44E51]">3</span>
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-gray-900">Learn More</h4>
                  <p className="mt-1 text-gray-600">Click "Learn more" on any feature to see a detailed page with demos and examples.</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="mt-1 flex-shrink-0 h-6 w-6 rounded-full bg-[#E44E51]/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-[#E44E51]">4</span>
                </div>
                <div className="ml-3">
                  <h4 className="font-medium text-gray-900">Try Features</h4>
                  <p className="mt-1 text-gray-600">Ready to experience a feature? Click "Try All Features" to jump into the application.</p>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Right column - Visual guide */}
          <motion.div 
            className="relative bg-gray-50 rounded-lg p-6 pt-10 shadow-inner overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="absolute top-2 left-3 flex space-x-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            
            <div className="space-y-4">
              {/* Category example */}
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <div className="flex items-center space-x-3 cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-[#E44E51]/10 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-[#E44E51]" />
                  </div>
                  <div>
                    <h5 className="text-lg font-bold text-gray-900">AI Features</h5>
                    <div className="flex items-center text-xs text-[#E44E51]">
                      <span>View all 12 features</span>
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Expanded view */}
              <div className="bg-white rounded-lg shadow-sm p-3">
                <div className="text-sm text-gray-500 mb-2">Expanded Category View</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-gray-100 rounded-md p-3 bg-white">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                      <Camera className="w-4 h-4 text-blue-600" />
                    </div>
                    <h6 className="text-sm font-medium">Face Detection</h6>
                  </div>
                  <div className="border border-gray-100 rounded-md p-3 bg-white">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mb-2">
                      <Layers className="w-4 h-4 text-purple-600" />
                    </div>
                    <h6 className="text-sm font-medium">Background Blur</h6>
                  </div>
                </div>
                <div className="mt-2 text-sm text-[#E44E51] flex items-center">
                  <span>Explore all AI features</span>
                  <ChevronRight className="w-3 h-3 ml-1" />
                </div>
              </div>
              
              {/* Feature card on hover */}
              <div className="relative bg-white rounded-lg shadow-sm border-2 border-[#E44E51] p-3 transform translate-y-2 scale-105">
                <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[#E44E51] text-white flex items-center justify-center text-xs">
                  <span>3</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mb-2">
                  <Trash2 className="w-4 h-4 text-green-600" />
                </div>
                <h6 className="text-sm font-medium">Background Removal</h6>
                <ul className="mt-2 space-y-1">
                  <li className="flex items-center text-xs text-gray-600">
                    <div className="w-3 h-3 text-green-500 mr-1">✓</div>
                    <span>No green screen needed</span>
                  </li>
                  <li className="flex items-center text-xs text-gray-600">
                    <div className="w-3 h-3 text-green-500 mr-1">✓</div>
                    <span>Real-time processing</span>
                  </li>
                </ul>
                <div className="mt-2 text-xs text-[#E44E51] flex items-center">
                  <span>Learn more</span>
                  <ArrowRight className="w-3 h-3 ml-1" />
                </div>
              </div>
            </div>
            
            {/* Feature filters UI */}
            <div className="flex items-center justify-between mt-4 bg-white rounded-lg p-2 shadow-sm">
              <div className="flex space-x-1">
                <div className="p-1 bg-[#E44E51]/10 text-[#E44E51] rounded">
                  <Filter className="w-4 h-4" />
                </div>
                <div className="p-1 bg-gray-100 text-gray-600 rounded">
                  <Search className="w-4 h-4" />
                </div>
              </div>
              <div className="flex space-x-1">
                <div className="p-1 bg-[#E44E51]/10 text-[#E44E51] rounded">
                  <Grid className="w-4 h-4" />
                </div>
                <div className="p-1 bg-gray-100 text-gray-600 rounded">
                  <Layout className="w-4 h-4" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Feature category list */}
        <motion.div 
          className="mt-8 grid grid-cols-2 sm:grid-cols-5 gap-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <Brain className="w-8 h-8 mx-auto text-blue-600 mb-2" />
            <p className="text-sm font-medium text-blue-800">AI Features</p>
            <p className="text-xs text-blue-600">12 features</p>
          </div>
          <div className="bg-rose-50 p-4 rounded-lg text-center">
            <Video className="w-8 h-8 mx-auto text-rose-600 mb-2" />
            <p className="text-sm font-medium text-rose-800">Recording</p>
            <p className="text-xs text-rose-600">8 features</p>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg text-center">
            <Scissors className="w-8 h-8 mx-auto text-amber-600 mb-2" />
            <p className="text-sm font-medium text-amber-800">Editing</p>
            <p className="text-xs text-amber-600">10 features</p>
          </div>
          <div className="bg-cyan-50 p-4 rounded-lg text-center">
            <Download className="w-8 h-8 mx-auto text-cyan-600 mb-2" />
            <p className="text-sm font-medium text-cyan-800">Export</p>
            <p className="text-xs text-cyan-600">6 features</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <Sparkles className="w-8 h-8 mx-auto text-green-600 mb-2" />
            <p className="text-sm font-medium text-green-800">Animation</p>
            <p className="text-xs text-green-600">5 features</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ComprehensiveFeatureSetExplainer;