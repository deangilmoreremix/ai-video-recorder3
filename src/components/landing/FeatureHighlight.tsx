import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface FeatureHighlightProps {
  title: string;
  description: string;
  imgSrc: string;
  features: {
    icon: React.ElementType;
    text: string;
  }[];
  linkText: string;
  linkUrl: string;
  reversed?: boolean;
}

const FeatureHighlight: React.FC<FeatureHighlightProps> = ({ 
  title,
  description,
  imgSrc,
  features,
  linkText,
  linkUrl,
  reversed = false
}) => {
  // Handle image error
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error(`Failed to load image: ${imgSrc}`);
    // Set a fallback image
    e.currentTarget.src = 'https://images.unsplash.com/photo-1581472723648-909f4851d4ae?auto=format&fit=crop&w=1000&q=80';
    e.currentTarget.alt = 'Feature image';
  };

  return (
    <div className="md:flex md:items-center md:space-x-16">
      <div className={`md:w-1/2 ${reversed ? 'order-2' : 'order-1'}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <motion.img
            src={imgSrc}
            alt={title}
            onError={handleImageError}
            className="rounded-xl shadow-xl"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      </div>
      
      <div className={`mt-10 md:mt-0 md:w-1/2 ${reversed ? 'order-1' : 'order-2'}`}>
        <motion.div
          initial={{ opacity: 0, x: reversed ? -20 : 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <h3 className="text-3xl font-bold text-gray-900">{title}</h3>
          <p className="mt-4 text-lg text-gray-600">{description}</p>
          
          <div className="mt-8 space-y-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex items-start">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#E44E51]/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-[#E44E51]" />
                  </div>
                  <p className="ml-4 text-lg text-gray-600">{feature.text}</p>
                </div>
              );
            })}
          </div>
          
          <div className="mt-8">
            <Link
              to={linkUrl}
              className="inline-flex items-center text-[#E44E51] font-medium hover:text-[#D43B3E] group"
            >
              <span>{linkText}</span>
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default FeatureHighlight;