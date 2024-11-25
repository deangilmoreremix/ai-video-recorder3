{/* Import button */}
<button
  onClick={() => fileInputRef.current?.click()}
  className="flex items-center space-x-2 px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] shadow-lg hover:shadow-[#E44E51]/25 transition-colors"
>
  <Upload className="w-4 h-4" />
  <span>{isProcessing ? 'Processing...' : 'Import Media'}</span>
</button>

{/* Category buttons */}
<button
  className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
    currentCategory === category
      ? 'bg-[#E44E51]/10 text-[#E44E51]'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`}
>
  {/* Button content */}
</button>

{/* Selected state */}
<div
  className={`relative ${
    selectedClip === clip.id ? 'ring-2 ring-[#E44E51]' : ''
  }`}
>
  {/* Content */}
</div>