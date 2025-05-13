import React from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';

const PricingPage = () => {
  const plans = [
    {
      name: 'Basic',
      price: 'Free',
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
      popular: false
    },
    {
      name: 'Pro',
      price: '$12',
      period: 'per month',
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
      popular: true
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
        'Dedicated account manager'
      ],
      highlight: false,
      ctaText: 'Contact Sales',
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="py-24 bg-gradient-to-r from-gray-900 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.h1 
              className="text-4xl font-extrabold text-white sm:text-5xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              Simple, Transparent Pricing
            </motion.h1>
            <motion.p 
              className="mt-4 text-xl text-gray-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Choose the plan that's right for you and start creating amazing videos today
            </motion.p>
          </div>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                className={`relative rounded-2xl transition-all duration-200 ${
                  plan.highlight 
                    ? 'bg-gradient-to-b from-[#E44E51]/95 to-[#D43B3E]/95 text-white shadow-xl ring-4 ring-[#E44E51]/30 transform md:-translate-y-4'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-6 transform -translate-y-1/2">
                    <span className="inline-flex items-center px-4 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="p-8">
                  <h3 className={`text-2xl font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h3>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-4xl font-extrabold">{plan.price}</span>
                    {plan.period && (
                      <span className={`ml-1 text-xl font-medium ${plan.highlight ? 'text-white/80' : 'text-gray-500'}`}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className={`mt-2 text-sm ${plan.highlight ? 'text-white/80' : 'text-gray-500'}`}>
                    {plan.description}
                  </p>
                  
                  <ul className="mt-8 space-y-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <div className={`flex-shrink-0 ${plan.highlight ? 'text-white' : 'text-[#E44E51]'}`}>
                          <Check className="h-5 w-5" />
                        </div>
                        <span className={`ml-3 text-sm ${plan.highlight ? 'text-white' : 'text-gray-700'}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-8">
                    <Link
                      to="/app"
                      className={`block w-full py-3 px-4 rounded-lg text-center font-medium transition-colors ${
                        plan.highlight
                          ? 'bg-white text-[#E44E51] hover:bg-gray-50'
                          : 'bg-[#E44E51] text-white hover:bg-[#D43B3E]'
                      }`}
                    >
                      {plan.ctaText}
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h2>
            <p className="mt-4 text-xl text-gray-600">Answers to common questions about our plans and features</p>
          </div>
          
          <div className="mt-16 max-w-3xl mx-auto">
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-medium text-gray-900">Can I change plans later?</h3>
                <p className="mt-2 text-gray-600">Yes, you can upgrade, downgrade, or cancel your plan at any time. Changes to your plan will take effect at the start of your next billing cycle.</p>
              </div>
              
              <div>
                <h3 className="text-xl font-medium text-gray-900">Is there a free trial?</h3>
                <p className="mt-2 text-gray-600">Yes, we offer a 14-day free trial of our Pro plan. No credit card is required to sign up for the trial.</p>
              </div>
              
              <div>
                <h3 className="text-xl font-medium text-gray-900">What payment methods do you accept?</h3>
                <p className="mt-2 text-gray-600">We accept all major credit cards, PayPal, and for Enterprise customers, we can arrange invoicing.</p>
              </div>
              
              <div>
                <h3 className="text-xl font-medium text-gray-900">Do I need to download any software?</h3>
                <p className="mt-2 text-gray-600">No, AI Screen Recorder is a fully web-based application that works in your browser. No downloads or installations are required.</p>
              </div>
              
              <div>
                <h3 className="text-xl font-medium text-gray-900">Are there any limitations on the Basic plan?</h3>
                <p className="mt-2 text-gray-600">The Basic plan is limited to 10-minute recordings and 720p resolution. Some advanced AI features are also limited to Pro and Enterprise plans.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="bg-[#E44E51] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Ready to transform your videos?
          </h2>
          <p className="mt-4 text-xl text-white/90">
            Start creating professional videos with our powerful tools today.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/app"
              className="rounded-md bg-white px-6 py-3 text-lg font-semibold text-[#E44E51] shadow-lg hover:bg-gray-100 transition-all duration-200 inline-flex items-center space-x-2"
            >
              <span>Try Free Now</span>
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default PricingPage;