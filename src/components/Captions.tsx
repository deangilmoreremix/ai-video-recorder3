{/* Generate button */}
<button
  onClick={generateCaptions}
  disabled={processing}
  className="flex items-center space-x-2 px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] disabled:opacity-50 shadow-lg hover:shadow-[#E44E51]/25 transition-colors"
>
  {processing ? (
    <>
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
      <span>Processing...</span>
    </>
  ) : (
    <>
      <Wand2 className="w-4 h-4" />
      <span>Generate Captions</span>
    </>
  )}
</button>

{/* Toggle switches */}
<div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
  peer-focus:ring-[#E44E51]/30 rounded-full peer peer-checked:after:translate-x-full 
  peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] 
  after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full 
  after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E44E51]" />