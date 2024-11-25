{/* Chapter editing state */}
<div className={`p-3 rounded-lg ${
  editingChapter === chapter.id ? 'bg-[#E44E51]/10' : 'bg-gray-50'
}`}>
  {/* Content */}
</div>

{/* Add chapter button */}
<button
  onClick={addChapter}
  className="p-2 hover:bg-[#E44E51]/10 rounded-lg text-[#E44E51] transition-colors"
>
  <Plus className="w-5 h-5" />
</button>