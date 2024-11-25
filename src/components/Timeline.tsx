{/* Timeline cursor */}
<div 
  className="absolute top-0 bottom-0 w-0.5 bg-[#E44E51]" 
  style={{ left: `${(currentTime / duration) * 100}%` }} 
/>

{/* Selected clip state */}
<div className={`absolute h-full ${
  selectedClip === clip.id ? 'ring-2 ring-[#E44E51]' : ''
}`}>
  {/* Content */}
</div>