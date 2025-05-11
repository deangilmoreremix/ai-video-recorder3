import React from 'react';
import { motion } from 'framer-motion';

interface RecordingModeCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  image: string;
  features: string[];
}

const RecordingModeCard: React.FC<RecordingModeCardProps> = ({
  title,
  description,
  icon: Icon,
  image,
  features
}) => {
  return (
    <motion.div
      className="bg-white rounded-xl shadow-lg overflow-hidden"
      whileHover={{ y: -5, boxShadow: '0 15px 30px rgba(0,0,0,0.1)' }}
    >
      <div className="h-48 overflow-hidden relative">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60">
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex items-center space-x-2">
              <Icon className="w-5 h-5" />
              <h3 className="text-lg font-semibold">{title}</h3>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <p className="text-gray-600 mb-4">{description}</p>
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <svg className="h-5 w-5 text-[#E44E51] mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
};

export default RecordingModeCard;