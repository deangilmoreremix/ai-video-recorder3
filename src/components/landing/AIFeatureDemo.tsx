import React from 'react';
import { motion } from 'framer-motion';

interface AIFeatureDemoProps {
  title: string;
  description: string;
  videoUrl: string;
  icon: React.ElementType;
  color: string;
  reversed?: boolean;
}

export const AIFeatureDemo: React.FC<AIFeatureDemoProps> = ({
  title,
  description,
  videoUrl,
  icon: Icon,
  color,
  reversed = false
}) => {
  return (
    <div className="md:flex md:items-center md:space-x-10">
      <div className={`md:w-1/2 ${reversed ? 'order-2' : 'order-1'}`}>
        <motion.div
          className="relative aspect-video rounded-xl overflow-hidden shadow-xl"
          initial={{ opacity: 0, x: reversed ? 50 : -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <video 
            className="w-full h-full object-cover"
            src={videoUrl}
            autoPlay
            loop
            muted
          ></video>
          
          {/* Feature overlay UI */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
            <div className="absolute top-4 left-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${color} text-white`}>
                <Icon className="w-4 h-4 mr-1" />
                {title}
              </span>
            </div>
            
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center justify-between">
                <div className="flex space-x-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#E44E51] animate-pulse"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-[#E44E51] animate-pulse delay-75"></div>
                  <div className="h-1.5 w-1.5 rounded-full bg-[#E44E51] animate-pulse delay-150"></div>
                </div>
                <div className="text-sm text-white">AI processing active</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      
      <div className={`md:w-1/2 mt-6 md:mt-0 ${reversed ? 'order-1' : 'order-2'}`}>
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, x: reversed ? -50 : 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
          <p className="text-lg text-gray-600">{description}</p>
          
          {/* Feature-specific UI elements could be added here */}
        </motion.div>
      </div>
    </div>
  );
};