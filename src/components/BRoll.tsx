// Update accent colors
<button
  onClick={() => fileInputRef.current?.click()}
  className="flex items-center space-x-2 px-4 py-2 bg-[#E44E51] text-white rounded-lg 
    hover:bg-[#D43B3E] transition-colors shadow-lg hover:shadow-[#E44E51]/25"
>

// Update selected states
<div className={`relative ${
  selectedClip === clip.id ? 'ring-2 ring-[#E44E51]' : ''
}`}>