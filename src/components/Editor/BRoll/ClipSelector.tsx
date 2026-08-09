import React, { useMemo } from 'react';
import { Film, Upload } from 'lucide-react';
import { useBRollStore, type BRollMediaType } from '../../../store/brollStore';
import { cn } from '../../../utils/cn';

interface ClipSelectorProps {
  /** Which media types can be picked. Defaults to video only. */
  types?: BRollMediaType[];
  label?: string;
  /** Optional badge renderer, e.g. to flag clips that already have effects. */
  renderBadge?: (clipId: string) => React.ReactNode;
}

/**
 * Strip of importable B-Roll clips used by the Backgrounds / Overlays /
 * Transitions tabs. Selection is stored in the shared B-Roll store so every
 * tab (and the Media Manager) stays in sync.
 */
export const ClipSelector: React.FC<ClipSelectorProps> = ({
  types = ['video'],
  label = 'Source clip',
  renderBadge
}) => {
  const clips = useBRollStore((state) => state.clips);
  const selectedClipId = useBRollStore((state) => state.selectedClipId);
  const setSelectedClipId = useBRollStore((state) => state.setSelectedClipId);

  const selectable = useMemo(
    () => clips.filter((clip) => types.includes(clip.type)),
    [clips, types]
  );

  if (selectable.length === 0) {
    return (
      <div className="flex items-center space-x-3 p-4 border border-dashed border-gray-300 rounded-lg text-gray-500">
        <Upload className="w-5 h-5" />
        <div className="text-sm">
          <p className="font-medium text-gray-700">No {types.join(' / ')} clips yet</p>
          <p>Import media in the Media Manager tab, then come back here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-xs text-gray-400">{selectable.length} available</span>
      </div>
      <div className="flex space-x-3 overflow-x-auto pb-2">
        {selectable.map((clip) => (
          <button
            key={clip.id}
            type="button"
            onClick={() => setSelectedClipId(clip.id)}
            className={cn(
              'relative w-36 shrink-0 rounded-lg overflow-hidden border text-left transition-colors',
              selectedClipId === clip.id
                ? 'border-[#E44E51] ring-2 ring-[#E44E51]/40'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div className="aspect-video bg-gray-100 flex items-center justify-center">
              {clip.thumbnail ? (
                <img src={clip.thumbnail} alt={clip.name} className="w-full h-full object-cover" />
              ) : (
                <Film className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="p-2">
              <p className="text-xs font-medium truncate">{clip.name}</p>
              <p className="text-[11px] text-gray-500">{Math.round(clip.duration)}s</p>
            </div>
            {renderBadge?.(clip.id)}
          </button>
        ))}
      </div>
    </div>
  );
};
