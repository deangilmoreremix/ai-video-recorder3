{/* Previous content remains the same, updating button colors */}
<button
  onClick={startRecording}
  className="flex items-center space-x-2 px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] shadow-lg hover:shadow-[#E44E51]/25 transition-colors"
>
  <Video className="w-5 h-5" />
  <span>Start Recording</span>
</button>

{/* AI feature buttons */}
<button
  className={`p-2 rounded-lg flex items-center space-x-2 ${
    aiSettings[feature].enabled
      ? 'bg-[#E44E51]/10 text-[#E44E51] border-[#E44E51] border'
      : 'bg-gray-50 hover:bg-gray-100'
  }`}
>
  {/* Button content */}
</button>