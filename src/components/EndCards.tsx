{/* Selected card state */}
<div className={`absolute ${
  selectedCard === card.id ? 'ring-2 ring-[#E44E51]' : ''
}`}>
  {/* Content */}
</div>

{/* Apply button */}
<button
  className="px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] 
    transition-colors shadow-lg hover:shadow-[#E44E51]/25"
>
  Apply Changes
</button>