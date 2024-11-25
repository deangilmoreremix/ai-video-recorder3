// Previous imports remain the same...

{/* Advanced Settings Panel */}
<AnimatePresence>
  {showAdvanced && (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="space-y-6 overflow-hidden bg-gray-50 rounded-lg p-4 mt-4"
    >
      {/* Video Processing */}
      <div className="space-y-4">
        <h4 className="font-medium flex items-center">
          <Video className="w-4 h-4 mr-2" />
          Video Processing
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Codec
            </label>
            <select
              value={settings.codec}
              onChange={(e) => updateSettings({ codec: e.target.value })}
              className="w-full rounded-lg border-gray-300"
            >
              <option value="h264">H.264</option>
              <option value="h265">H.265 (HEVC)</option>
              <option value="vp9">VP9</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Preset
            </label>
            <select
              value={settings.preset}
              onChange={(e) => updateSettings({ preset: e.target.value })}
              className="w-full rounded-lg border-gray-300"
            >
              <option value="ultrafast">Ultra Fast</option>
              <option value="superfast">Super Fast</option>
              <option value="veryfast">Very Fast</option>
              <option value="faster">Faster</option>
              <option value="fast">Fast</option>
              <option value="medium">Medium</option>
              <option value="slow">Slow</option>
              <option value="slower">Slower</option>
              <option value="veryslow">Very Slow</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Profile
            </label>
            <select
              value={settings.profile}
              onChange={(e) => updateSettings({ profile: e.target.value })}
              className="w-full rounded-lg border-gray-300"
            >
              <option value="baseline">Baseline</option>
              <option value="main">Main</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Pixel Format
            </label>
            <select
              value={settings.pixelFormat}
              onChange={(e) => updateSettings({ pixelFormat: e.target.value })}
              className="w-full rounded-lg border-gray-300"
            >
              <option value="yuv420p">YUV420P</option>
              <option value="yuv422p">YUV422P</option>
              <option value="yuv444p">YUV444P</option>
            </select>
          </div>
        </div>
      </div>

      {/* Color Settings */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium flex items-center">
          <Palette className="w-4 h-4 mr-2" />
          Color Settings
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Color Space
            </label>
            <select
              value={settings.colorSpace}
              onChange={(e) => updateSettings({ colorSpace: e.target.value })}
              className="w-full rounded-lg border-gray-300"
            >
              <option value="bt709">BT.709 (HD)</option>
              <option value="bt2020">BT.2020 (4K)</option>
              <option value="bt601">BT.601 (SD)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Color Range
            </label>
            <select
              value={settings.colorRange}
              onChange={(e) => updateSettings({ colorRange: e.target.value })}
              className="w-full rounded-lg border-gray-300"
            >
              <option value="tv">Limited (TV)</option>
              <option value="pc">Full (PC)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audio Processing */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium flex items-center">
          <Music className="w-4 h-4 mr-2" />
          Audio Processing
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Sample Rate
            </label>
            <select
              value={settings.sampleRate}
              onChange={(e) => updateSettings({ sampleRate: parseInt(e.target.value) })}
              className="w-full rounded-lg border-gray-300"
            >
              <option value="48000">48 kHz</option>
              <option value="44100">44.1 kHz</option>
              <option value="32000">32 kHz</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Audio Normalization
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.normalizeAudio}
                onChange={(e) => updateSettings({ normalizeAudio: e.target.checked })}
                className="rounded border-gray-300 text-[#E44E51]"
              />
              <span className="text-sm">Enable</span>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Features */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium flex items-center">
          <Settings className="w-4 h-4 mr-2" />
          Advanced Features
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.fastStart}
              onChange={(e) => updateSettings({ fastStart: e.target.checked })}
              className="rounded border-gray-300 text-[#E44E51]"
            />
            <span className="text-sm">Fast Start (Web Optimized)</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.useGpu}
              onChange={(e) => updateSettings({ useGpu: e.target.checked })}
              className="rounded border-gray-300 text-[#E44E51]"
            />
            <span className="text-sm">GPU Acceleration</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.twoPass}
              onChange={(e) => updateSettings({ twoPass: e.target.checked })}
              className="rounded border-gray-300 text-[#E44E51]"
            />
            <span className="text-sm">Two-Pass Encoding</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={settings.keyframeInterval}
              onChange={(e) => updateSettings({ keyframeInterval: e.target.checked })}
              className="rounded border-gray-300 text-[#E44E51]"
            />
            <span className="text-sm">Keyframe Optimization</span>
          </label>
        </div>
      </div>

      {/* Metadata */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium flex items-center">
          <Info className="w-4 h-4 mr-2" />
          Metadata
        </h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={settings.metadata?.title || ''}
              onChange={(e) => updateSettings({
                metadata: { ...settings.metadata, title: e.target.value }
              })}
              className="w-full rounded-lg border-gray-300"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={settings.metadata?.description || ''}
              onChange={(e) => updateSettings({
                metadata: { ...settings.metadata, description: e.target.value }
              })}
              className="w-full rounded-lg border-gray-300"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={settings.metadata?.tags || ''}
              onChange={(e) => updateSettings({
                metadata: { ...settings.metadata, tags: e.target.value }
              })}
              className="w-full rounded-lg border-gray-300"
            />
          </div>
        </div>
      </div>

      {/* Custom FFmpeg Commands */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium flex items-center">
          <Terminal className="w-4 h-4 mr-2" />
          Custom FFmpeg Commands
        </h4>
        <div>
          <label className="block text-sm text-gray-700 mb-1">
            Additional Arguments
          </label>
          <input
            type="text"
            value={settings.customArgs || ''}
            onChange={(e) => updateSettings({ customArgs: e.target.value })}
            placeholder="-movflags +faststart -profile:v high -level:v 4.1"
            className="w-full rounded-lg border-gray-300 font-mono text-sm"
          />
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>

// Rest of the component remains the same...