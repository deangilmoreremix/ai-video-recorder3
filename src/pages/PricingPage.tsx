import React, { useState } from 'react';
import { motion, AnimatePresence, MotionValue, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { 
  Check, ChevronRight, ChevronDown, X, Star, ArrowRight, 
  Shield, Clock, Zap, Download, Users, Layout, Video, 
  MessageSquare, LifeBuoy, Lightbulb, PlusCircle, MinusCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';

const PricingPage = () => {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [isComparisonVisible, setIsComparisonVisible] = useState(false);
  
  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };
  
  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };

  const plans = [
    {
      name: 'Basic',
      price: billingPeriod === 'monthly' ? 'Free' : 'Free',
      description: 'Everything you need to get started',
      features: [
        'Basic screen and webcam recording',
        'Up to 720p video resolution',
        'Limited to 10-minute recordings',
        'Basic editing tools',
        'Standard export formats',
        'No watermark'
      ],
      highlight: false,
      ctaText: 'Get Started',
      popular: false,
      color: 'from-blue-500 to-blue-600'
    },
    {
      name: 'Pro',
      price: billingPeriod === 'monthly' ? '$12' : '$108',
      period: billingPeriod === 'monthly' ? 'per month' : 'per year',
      saving: billingPeriod === 'annual' ? 'Save $36' : null,
      description: 'Perfect for content creators',
      features: [
        'Advanced recording modes',
        'Up to 4K video resolution',
        'Unlimited recording length',
        'All AI features included',
        'All editing tools and effects',
        'Background removal & blur',
        'GIF creation and optimization',
        'Custom intros and outros',
        'Priority support'
      ],
      highlight: true,
      ctaText: 'Start Free Trial',
      popular: true,
      color: 'from-[#E44E51] to-[#D43B3E]'
    },
    {
      name: 'Enterprise',
      price: 'Contact Us',
      description: 'For teams and businesses',
      features: [
        'Everything in Pro plan',
        '24/7 priority support',
        'Team collaboration features',
        'Custom branding options',
        'API access',
        'SSO integration',
        'Advanced analytics',
        'Dedicated account manager',
        'Training & onboarding'
      ],
      highlight: false,
      ctaText: 'Contact Sales',
      popular: false,
      color: 'from-purple-500 to-indigo-600'
    }
  ];

  const faqs = [
    {
      question: 'Can I change plans later?',
      answer: 'Yes, you can upgrade, downgrade, or cancel your plan at any time. Changes to your plan will take effect at the start of your next billing cycle.'
    },
    {
      question: 'Is there a free trial?',
      answer: 'Yes, we offer a 14-day free trial of our Pro plan. No credit card is required to sign up for the trial, and you can cancel anytime.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards, PayPal, and for Enterprise customers, we can arrange invoicing. All payments are securely processed.'
    },
    {
      question: 'Do I need to download any software?',
      answer: 'No, AI Screen Recorder is a fully web-based application that works in your browser. No downloads or installations are required. Just sign up and start recording!'
    },
    {
      question: 'Are there any limitations on the Basic plan?',
      answer: 'The Basic plan is limited to 10-minute recordings and 720p resolution. Some advanced AI features are also limited to Pro and Enterprise plans. Check our comparison table for more details.'
    },
    {
      question: 'How do I cancel my subscription?',
      answer: 'You can cancel your subscription at any time from your account settings page. After cancellation, you\'ll still be able to use your paid features until the end of your current billing period.'
    }
  ];

  const testimonials = [
    {
      text: "AI Screen Recorder's Pro plan is a game-changer for our tutorials. The background removal and AI features have saved us countless hours.",
      author: "Sarah Johnson",
      role: "Content Director, TechLearn",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&q=80"
    },
    {
      text: "The Enterprise plan gives our team the collaboration tools we needed. The custom branding alone is worth the investment.",
      author: "Michael Chen",
      role: "Marketing VP, GrowthCo",
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-1.2.1&auto=format&fit=crop&w=120&q=80"
    }
  ];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };
  
  const planCardVariants = {
    initial: { y: 50, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    hover: { 
      y: -5,
      boxShadow: "0px 15px 30px rgba(0, 0, 0, 0.1)",
      transition: { type: "spring", stiffness: 300 }
    },
    selected: { 
      y: -10,
      boxShadow: "0px 20px 40px rgba(0, 0, 0, 0.15)",
      transition: { type: "spring", stiffness: 300 }
    }
  };

  // Compare all plans feature table (simplified for common features)
  const comparisonFeatures = [
    { name: 'Screen Recording', basic: true, pro: true, enterprise: true },
    { name: 'Webcam Recording', basic: true, pro: true, enterprise: true },
    { name: 'Picture-in-Picture', basic: false, pro: true, enterprise: true },
    { name: '4K Resolution', basic: false, pro: true, enterprise: true },
    { name: 'Unlimited Recording Time', basic: false, pro: true, enterprise: true },
    { name: 'Background Removal', basic: false, pro: true, enterprise: true },
    { name: 'Background Blur', basic: false, pro: true, enterprise: true },
    { name: 'AI Face Tracking', basic: false, pro: true, enterprise: true },
    { name: 'AI Beautification', basic: false, pro: true, enterprise: true },
    { name: 'Silent Removal', basic: true, pro: true, enterprise: true },
    { name: 'Auto Captions', basic: 'Limited', pro: true, enterprise: true },
    { name: 'Chapter Markers', basic: true, pro: true, enterprise: true },
    { name: 'GIF Creation', basic: 'Limited', pro: true, enterprise: true },
    { name: 'Video Effects', basic: 'Basic only', pro: true, enterprise: true },
    { name: 'Transitions', basic: 'Basic only', pro: true, enterprise: true },
    { name: 'Custom Intros/Outros', basic: false, pro: true, enterprise: true },
    { name: 'Team Collaboration', basic: false, pro: 'Limited', enterprise: true },
    { name: 'Priority Support', basic: false, pro: true, enterprise: true },
    { name: 'Dedicated Account Manager', basic: false, pro: false, enterprise: true },
    { name: 'Custom Branding', basic: false, pro: false, enterprise: true },
    { name: 'API Access', basic: false, pro: false, enterprise: true }
  ];

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Navbar />
      
      {/* Hero Section with Animated Gradient Background */}
      <div className="relative py-24 overflow-hidden">
        <motion.div 
          className="absolute inset-0 -z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-black" />
          <motion.div 
            className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-[#E44E51]/30 to-transparent rounded-full blur-3xl"
            animate={{ 
              x: [0, 20, 0], 
              y: [0, -20, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          />
          <motion.div 
            className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"
            animate={{ 
              x: [0, -30, 0], 
              y: [0, 20, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          />
        </motion.div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="inline-block"
            >
              <span className="inline-flex items-center px-4 py-1 rounded-full text-sm font-medium bg-[#E44E51]/10 text-[#E44E51]">
                Simple, Transparent Pricing
              </span>
            </motion.div>
            <motion.h1 
              className="mt-4 text-4xl font-extrabold text-white sm:text-5xl md:text-6xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              Choose the Perfect Plan for Your Needs
            </motion.h1>
            <motion.p 
              className="mt-4 max-w-2xl mx-auto text-xl text-gray-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              All plans include core features, updates, and community support.
              Start for free, no credit card required.
            </motion.p>
          </div>
          
          {/* Billing Toggle */}
          <motion.div 
            className="mt-10 flex justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="relative p-1 flex bg-white/10 backdrop-blur-lg rounded-full">
              <button
                className={`relative py-2 px-6 rounded-full text-sm font-medium transition-all duration-300 ${
                  billingPeriod === 'monthly' ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setBillingPeriod('monthly')}
              >
                Monthly
                {billingPeriod === 'monthly' && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-[#E44E51] to-[#D43B3E] rounded-full -z-10"
                    layoutId="billingPeriodTab"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
              <button
                className={`relative py-2 px-6 rounded-full text-sm font-medium transition-all duration-300 ${
                  billingPeriod === 'annual' ? 'text-white' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setBillingPeriod('annual')}
              >
                Annual
                {billingPeriod === 'annual' && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-[#E44E51] to-[#D43B3E] rounded-full -z-10"
                    layoutId="billingPeriodTab"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            </div>
            {billingPeriod === 'annual' && (
              <motion.div 
                className="ml-4 rounded-full bg-green-100 px-3 py-1 text-sm text-green-800 font-medium flex items-center"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                Save 25%
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
      
      {/* Pricing Cards */}
      <div className="relative -mt-20 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                variants={planCardVariants}
                initial="initial"
                animate={selectedPlan === plan.name ? "selected" : "animate"}
                whileHover="hover"
                transition={{ 
                  delay: index * 0.1,
                  duration: 0.5
                }}
                onClick={() => setSelectedPlan(plan.name)}
                className={`relative rounded-2xl overflow-hidden ${
                  plan.highlight 
                    ? 'ring-4 ring-[#E44E51]/30'
                    : 'ring-1 ring-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-6 transform -translate-y-1/2">
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + index * 0.1, type: "spring" }}
                      className="flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg"
                    >
                      <Star className="w-3 h-3 mr-1" /> Most Popular
                    </motion.div>
                  </div>
                )}
                
                <div className={`p-1 ${plan.highlight ? 'bg-gradient-to-b from-[#E44E51] to-[#D43B3E]' : 'bg-white'}`}>
                  <div className={`rounded-xl p-8 ${plan.highlight ? 'bg-[#E44E51]' : 'bg-white'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className={`text-2xl font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                          {plan.name}
                        </h3>
                        <p className={`mt-2 text-sm ${plan.highlight ? 'text-white/80' : 'text-gray-500'}`}>
                          {plan.description}
                        </p>
                      </div>
                      {plan.name === 'Pro' && (
                        <motion.div 
                          initial={{ rotate: 0 }}
                          animate={{ rotate: 360 }}
                          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                          className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center"
                        >
                          <Zap className="w-6 h-6 text-white" />
                        </motion.div>
                      )}
                    </div>
                    
                    <div className="mt-6">
                      <div className="flex items-baseline">
                        <span className={`text-5xl font-extrabold tracking-tight ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                          {plan.price}
                        </span>
                        {plan.period && (
                          <span className={`ml-2 text-lg ${plan.highlight ? 'text-white/80' : 'text-gray-500'}`}>
                            {plan.period}
                          </span>
                        )}
                      </div>
                      {plan.saving && (
                        <motion.p
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-1 text-sm text-white/80 font-medium"
                        >
                          {plan.saving}
                        </motion.p>
                      )}
                    </div>
                    
                    <div className={`mt-8 space-y-1 ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                      {plan.features.map((feature, i) => (
                        <motion.div 
                          key={i} 
                          className="flex items-start"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + (i * 0.05) }}
                        >
                          <div className={`flex-shrink-0 ${plan.highlight ? 'text-white' : 'text-[#E44E51]'}`}>
                            <Check className="h-5 w-5" />
                          </div>
                          <span className={`ml-3 text-sm ${plan.highlight ? 'text-white/90' : 'text-gray-700'}`}>
                            {feature}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                    
                    <motion.div 
                      className="mt-8"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Link
                        to="/app"
                        className={`block w-full py-3 px-4 rounded-lg text-center font-medium shadow-lg transition-colors ${
                          plan.highlight
                            ? 'bg-white text-[#E44E51] hover:bg-gray-50'
                            : 'bg-gradient-to-r from-[#E44E51] to-[#D43B3E] text-white hover:from-[#D43B3E] hover:to-[#C33B3E]'
                        }`}
                      >
                        {plan.ctaText}
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Compare All Plans button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="mt-12 text-center"
          >
            <button
              onClick={() => setIsComparisonVisible(!isComparisonVisible)}
              className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm rounded-lg text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            >
              {isComparisonVisible ? 'Hide Comparison' : 'Compare All Plans'}
              <ChevronDown className={`ml-2 w-5 h-5 transition-transform ${isComparisonVisible ? 'rotate-180' : ''}`} />
            </button>
          </motion.div>
        </div>
      </div>
      
      {/* Plan Feature Comparison Table */}
      <AnimatePresence>
        {isComparisonVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="px-6 py-8">
                  <h3 className="text-2xl font-bold text-gray-900">Compare All Features</h3>
                  <p className="mt-2 text-gray-600">Detailed comparison of all available features</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th scope="col" className="px-6 py-4 text-left text-sm font-medium text-gray-500">Feature</th>
                        <th scope="col" className="px-6 py-4 text-center text-sm font-medium text-gray-500">Basic</th>
                        <th scope="col" className="px-6 py-4 text-center text-sm font-medium text-[#E44E51]">Pro</th>
                        <th scope="col" className="px-6 py-4 text-center text-sm font-medium text-gray-500">Enterprise</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {comparisonFeatures.map((feature, index) => (
                        <motion.tr 
                          key={feature.name}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{feature.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                            {feature.basic === true ? (
                              <Check className="h-5 w-5 text-green-500 mx-auto" />
                            ) : feature.basic === false ? (
                              <X className="h-5 w-5 text-gray-300 mx-auto" />
                            ) : (
                              <span className="text-yellow-600">{feature.basic}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                            {feature.pro === true ? (
                              <Check className="h-5 w-5 text-[#E44E51] mx-auto" />
                            ) : feature.pro === false ? (
                              <X className="h-5 w-5 text-gray-300 mx-auto" />
                            ) : (
                              <span className="text-[#E44E51]">{feature.pro}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                            {feature.enterprise === true ? (
                              <Check className="h-5 w-5 text-green-500 mx-auto" />
                            ) : feature.enterprise === false ? (
                              <X className="h-5 w-5 text-gray-300 mx-auto" />
                            ) : (
                              <span className="text-purple-600">{feature.enterprise}</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Why Choose Us Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-900">Why Choose AI Screen Recorder</h2>
            <p className="mt-4 text-xl text-gray-600">Experience the difference with our premium features</p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-white p-6 rounded-xl shadow-md"
            >
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Powerful AI Features</h3>
              <p className="text-gray-600">Leverage advanced artificial intelligence to enhance your videos automatically. Face detection, background removal, and more in real-time.</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white p-6 rounded-xl shadow-md"
            >
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Professional Quality</h3>
              <p className="text-gray-600">Create studio-quality recordings with advanced editing tools, effects, and post-processing options designed for content creators.</p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white p-6 rounded-xl shadow-md"
            >
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Team Collaboration</h3>
              <p className="text-gray-600">Share projects, collaborate on edits, and manage your team's recordings from a centralized dashboard with our Enterprise plan.</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Testimonial Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-900">Loved by Content Creators</h2>
            <p className="mt-4 text-xl text-gray-600">See what our customers have to say about our subscription plans</p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-md p-6 border border-gray-100"
                whileHover={{ y: -5, boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.1)" }}
              >
                <div className="flex-shrink-0 mb-6">
                  <svg className="h-10 w-10 text-[#E44E51]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 18L14.017 10.609C14.017 4.905 17.748 1.039 23 0L23.995 2.151C21.563 3.068 20 5.789 20 8H24V18H14.017ZM0 18V10.609C0 4.905 3.748 1.038 9 0L9.996 2.151C7.563 3.068 6 5.789 6 8H9.983L9.983 18L0 18Z" />
                  </svg>
                </div>
                <blockquote className="font-medium text-xl text-gray-900 mb-6">{testimonial.text}</blockquote>
                <div className="flex items-center">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.author}
                    className="h-12 w-12 rounded-full mr-4 object-cover"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      
      {/* FAQ Accordion */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
            <p className="mt-4 text-xl text-gray-600">Everything you need to know about our plans</p>
          </motion.div>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center focus:outline-none"
                >
                  <span className="text-lg font-medium text-gray-900">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: expandedFaq === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {expandedFaq === index ? (
                      <MinusCircle className="w-5 h-5 text-[#E44E51]" />
                    ) : (
                      <PlusCircle className="w-5 h-5 text-gray-500" />
                    )}
                  </motion.div>
                </button>
                
                <AnimatePresence>
                  {expandedFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-4 text-gray-600">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-8 text-center"
          >
            <p className="text-gray-600">Still have questions?</p>
            <a 
              href="#" 
              className="mt-2 inline-flex items-center text-[#E44E51] hover:underline font-medium"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Contact our support team
            </a>
          </motion.div>
        </div>
      </div>

      {/* Money Back Guarantee Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="md:w-3/4">
              <motion.h3 
                className="text-2xl font-bold text-white"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                14-Day Money Back Guarantee
              </motion.h3>
              <motion.p 
                className="mt-2 text-lg text-blue-100"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                Try AI Screen Recorder Pro risk-free. If you're not completely satisfied, we'll refund your payment within 14 days of purchase.
              </motion.p>
            </div>
            <motion.div 
              className="mt-4 md:mt-0"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Shield className="w-16 h-16 text-white" />
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="bg-gradient-to-r from-[#E44E51] to-[#D43B3E] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2 
            className="text-3xl font-extrabold text-white sm:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            Ready to transform your videos?
          </motion.h2>
          <motion.p 
            className="mt-4 text-xl text-white/90"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            Get started with a 14-day free trial. No credit card required.
          </motion.p>
          <motion.div 
            className="mt-8 flex justify-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/app"
                className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg shadow-lg bg-white text-[#E44E51] hover:bg-gray-50 transition-colors"
              >
                Start Your Free Trial
                <ArrowRight className="ml-3 w-5 h-5" />
              </Link>
            </motion.div>
          </motion.div>
          <motion.p 
            className="mt-4 text-sm text-white/80"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            No credit card required. Cancel anytime.
          </motion.p>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default PricingPage;