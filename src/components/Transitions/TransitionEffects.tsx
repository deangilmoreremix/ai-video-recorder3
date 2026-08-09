import React, { useState } from 'react';
import { ArrowLeftRight, ArrowUpDown, Combine, Divide, Layers, RotateCcw, Shuffle, Move, type LucideIcon } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import { useBRollStore, type ClipTransition, type TransitionType } from '../../store/brollStore';

interface TransitionEffect {
  name: string;
  type: TransitionType;
  icon: LucideIcon;
  description: string;
}

interface TransitionEffectsProps {
  /**
   * Controlled selection. When provided the component renders the caller's
   * value and reports every change through `onChange`; when omitted it keeps
   * its own selection so it still works as a standalone panel.
   */
  value?: ClipTransition | null;
  onChange?: (value: ClipTransition | null) => void;
  /** Called when the user commits the transition (e.g. persist it on a clip). */
  onApply?: (value: ClipTransition) => void;
  /** Called when the user resets the selection. */
  onReset?: () => void;
  /** Optional context line, e.g. which clip the transition will be applied to. */
  description?: string;
  /** Label for the commit button. */
  applyLabel?: string;
}

const TRANSITIONS: TransitionEffect[] = [
  { name: 'Dissolve', type: 'dissolve', icon: Layers, description: 'Smooth cross-fade between clips' },
  { name: 'Slide Left', type: 'slide-left', icon: ArrowLeftRight, description: 'Slide clip from right to left' },
  { name: 'Slide Right', type: 'slide-right', icon: ArrowLeftRight, description: 'Slide clip from left to right' },
  { name: 'Slide Up', type: 'slide-up', icon: ArrowUpDown, description: 'Slide clip from bottom to top' },
  { name: 'Slide Down', type: 'slide-down', icon: ArrowUpDown, description: 'Slide clip from top to bottom' },
  { name: 'Fade', type: 'fade', icon: Move, description: 'Fade through black' },
  { name: 'Wipe', type: 'wipe', icon: Divide, description: 'Wipe from one clip to another' },
  { name: 'Cross Zoom', type: 'cross-zoom', icon: Combine, description: 'Zoom transition between clips' },
  { name: 'Rotate', type: 'rotate', icon: RotateCcw, description: 'Rotating transition effect' }
];

const DEFAULT_DURATION = 1;

/** Pick a concrete transition so "random" always resolves to something renderable. */
const randomTransition = (exclude?: TransitionType | null): TransitionType => {
  const options = TRANSITIONS.filter((transition) => transition.type !== exclude);
  return options[Math.floor(Math.random() * options.length)].type;
};

export const TransitionEffects: React.FC<TransitionEffectsProps> = ({
  value,
  onChange,
  onApply,
  onReset,
  description,
  applyLabel = 'Apply Transition'
}) => {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<ClipTransition | null>(null);
  const [appliedTo, setAppliedTo] = useState<string | null>(null);
  const selection = isControlled ? value ?? null : internalValue;

  // Standalone usage still does real work: it writes the transition onto the
  // clip currently selected in the B-Roll store.
  const clips = useBRollStore((state) => state.clips);
  const selectedClipId = useBRollStore((state) => state.selectedClipId);
  const setClipTransition = useBRollStore((state) => state.setClipTransition);
  const fallbackClip = clips.find((clip) => clip.id === selectedClipId) ?? null;
  const canApply = Boolean(onApply || fallbackClip);

  const commitSelection = (next: ClipTransition | null) => {
    setAppliedTo(null);
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
  };

  const selectType = (type: TransitionType) => {
    if (selection?.type === type) {
      commitSelection(null);
      return;
    }
    commitSelection({ type, duration: selection?.duration ?? DEFAULT_DURATION });
  };

  const setDuration = (duration: number) => {
    commitSelection({ type: selection?.type ?? 'dissolve', duration });
  };

  const handleReset = () => {
    commitSelection(null);
    onReset?.();
  };

  const handleApply = () => {
    if (!selection) return;
    if (onApply) {
      onApply(selection);
      return;
    }
    if (fallbackClip) {
      setClipTransition(fallbackClip.id, selection);
      setAppliedTo(fallbackClip.name);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Transition Effects</h3>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>

      <div className="grid grid-cols-5 gap-3 mb-4">
        {TRANSITIONS.map((transition) => {
          const Icon = transition.icon;
          const isSelected = selection?.type === transition.type;
          return (
            <Tooltip key={transition.type} content={transition.description}>
              <button
                onClick={() => selectType(transition.type)}
                className={`flex flex-col items-center w-full p-3 rounded-lg transition-colors
                  ${isSelected
                    ? 'bg-[#E44E51]/10 border-[#E44E51] border-2 text-[#E44E51]'
                    : 'border border-gray-200 hover:bg-gray-50'}`}
              >
                <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-[#E44E51]' : 'text-gray-600'}`} />
                <span className="text-xs text-center">{transition.name}</span>
              </button>
            </Tooltip>
          );
        })}
        <Tooltip content="Pick one of the transitions above at random">
          <button
            onClick={() =>
              commitSelection({
                type: randomTransition(selection?.type),
                duration: selection?.duration ?? DEFAULT_DURATION
              })
            }
            className="flex flex-col items-center w-full p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <Shuffle className="w-6 h-6 mb-2 text-gray-600" />
            <span className="text-xs text-center">Random</span>
          </button>
        </Tooltip>
      </div>

      {selection && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <Tooltip content="Adjust how long the transition effect takes to complete">
            <div className="space-y-2 w-full">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Duration</span>
                <span className="text-sm text-gray-500">{selection.duration.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={selection.duration}
                onChange={(e) => setDuration(parseFloat(e.target.value) || 0.1)}
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer
                  accent-[#E44E51]"
              />
            </div>
          </Tooltip>

          <div className="flex items-center justify-end space-x-2">
            {appliedTo && (
              <span className="mr-auto text-sm text-emerald-600">
                Applied to “{appliedTo}”
              </span>
            )}
            <Tooltip content="Clear the selected transition">
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Reset
              </button>
            </Tooltip>
            <Tooltip
              content={
                canApply
                  ? 'Save this transition'
                  : 'Select a clip in the B-Roll Media Manager to apply it'
              }
            >
              <button
                onClick={handleApply}
                disabled={!canApply}
                className="px-3 py-1.5 bg-[#E44E51] text-white text-sm rounded-lg
                  hover:bg-[#D43B3E] transition-colors shadow-lg hover:shadow-[#E44E51]/25
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {applyLabel}
              </button>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
};
