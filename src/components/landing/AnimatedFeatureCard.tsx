import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface AnimatedFeatureCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  details: string[];
  link: string;
  delay?: number;
}

const AnimatedFeatureCard: React.FC<AnimatedFeatureCardProps> = ({
  title,
  description,
  icon: Icon,
  color,
  details,
  link,
  delay = 0
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="bg-white rounded-xl shadow-lg overflow-hidden h-full border border-gray-100"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 + delay * 0.1 }}
      whileHover={{
        y: -8,
        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)"
      }}
    >
      <div className="p-6">
        <div className={`w-14 h-14 rounded-full bg-gradient-to-r ${color} flex items-center justify-center mb-4`}>
          <motion.div
            animate={{ rotate: isHovered ? 360 : 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <Icon className="h-7 w-7 text-white" />
          </motion.div>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className={`w-full h-px bg-gradient-to-r ${color} my-3`}></div>
              <ul className="space-y-2 mb-4">
                {details.map((detail, index) => (
                  <motion.li 
                    key={index} 
                    className="flex items-start"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-600">{detail}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
        
        <Link
          to={link}
          className="inline-flex items-center text-sm font-medium text-[#E44E51] hover:text-[#D43B3E] group"
        >
          <span>Learn more</span>
          <motion.div
            animate={{ x: isHovered ? 5 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ArrowRight className="ml-2 w-4 h-4" />
          </motion.div>
        </Link>
      </div>
      
      <motion.div 
        className={`h-1.5 bg-gradient-to-r ${color} w-0`}
        animate={{ width: isHovered ? '100%' : '0%' }}
        transition={{ duration: 0.5 }}
      />
    </motion.div>
  );
};

export default AnimatedFeatureCard;