import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  link: string;
  color: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon: Icon, link, color }) => {
  return (
    <motion.div
      whileHover={{ y: -5, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
      className="bg-white rounded-xl shadow-lg p-6 border border-gray-100"
    >
      <div className={`h-12 w-12 rounded-full bg-gradient-to-r ${color} flex items-center justify-center mb-4`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{description}</p>
      <Link
        to={link}
        className="inline-flex items-center text-[#E44E51] font-medium hover:text-[#D43B3E]"
      >
        <span>Learn more</span>
        <ArrowRight className="ml-2 w-4 h-4" />
      </Link>
    </motion.div>
  );
};

export default FeatureCard;