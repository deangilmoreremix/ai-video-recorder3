{/* AI feature buttons */}
<button
  onClick={() => handleAIFeatureToggle(feature.id)}
  className={`w-full flex items-center p-3 rounded-lg transition-colors ${
    feature.enabled 
      ? 'bg-[#E44E51]/10 text-[#E44E51] border-[#E44E51] border' 
      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
  }`}
>
  {/* Button content */}
</button>

{/* Toggle switches */}
<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
  peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
  peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
  after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
  after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]" />