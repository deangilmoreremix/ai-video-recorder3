import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { Scissors, Plus, ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';

interface TimelineProps {
  /** The player the timeline scrubs. */
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  /** Source of the clips created with the "+" button. */
  videoUrl?: string | null;
}

/** Nothing shorter than this can be split off as its own clip. */
const MIN_CLIP_LENGTH = 0.2;

export const Timeline: React.FC<TimelineProps> = ({ videoRef, videoUrl }) => {
  const {
    clips,
    currentTime,
    duration,
    chapters,
    selectedClipId,
    setCurrentTime,
    setDuration,
    setSelectedClipId,
    addClip,
    updateClip,
    removeClip
  } = useEditorStore();

  const timelineRef = useRef<HTMLDivElement>(null);

  /** Moves both the store and the actual <video> element. */
  const seek = useCallback(
    (time: number) => {
      const safeTime = Math.max(0, duration > 0 ? Math.min(duration, time) : time);
      setCurrentTime(safeTime);
      const video = videoRef?.current;
      if (video && Number.isFinite(safeTime)) {
        video.currentTime = safeTime;
      }
    },
    [duration, setCurrentTime, videoRef]
  );

  // Mirror the player into the store so the ruler, playhead and the clip tools
  // all work on the time the user is actually looking at.
  useEffect(() => {
    const video = videoRef?.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDuration = () => {
      // MediaRecorder files report Infinity until they have been scanned.
      if (Number.isFinite(video.duration) && video.duration > 0) setDuration(video.duration);
    };

    handleDuration();
    if (video.readyState >= 1) setCurrentTime(video.currentTime);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeked', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleDuration);
    video.addEventListener('durationchange', handleDuration);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeked', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleDuration);
      video.removeEventListener('durationchange', handleDuration);
    };
  }, [videoRef, videoUrl, setCurrentTime, setDuration]);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current || duration <= 0) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const clickPosition = e.clientX - rect.left;
    const percentage = clickPosition / rect.width;

    seek(percentage * duration);
  };

  const formatTime = (seconds: number) => {
    const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
    const pad = (num: number) => num.toString().padStart(2, '0');
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const secs = Math.floor(safe % 60);

    return hours > 0 
      ? `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
      : `${pad(minutes)}:${pad(secs)}`;
  };

  /** Clip boundaries and chapter marks are the points the arrows jump between. */
  const editPoints = useMemo(() => {
    const points = new Set<number>([0]);
    if (duration > 0) points.add(duration);
    clips.forEach((clip) => {
      points.add(clip.startTime);
      points.add(clip.endTime);
    });
    chapters.forEach((chapter) => points.add(chapter.time));
    return [...points].filter((point) => Number.isFinite(point) && point >= 0).sort((a, b) => a - b);
  }, [clips, chapters, duration]);

  const goToPrevious = () => {
    const previous = [...editPoints].reverse().find((point) => point < currentTime - 0.05);
    seek(previous ?? 0);
  };

  const goToNext = () => {
    const next = editPoints.find((point) => point > currentTime + 0.05);
    seek(next ?? (duration > 0 ? duration : currentTime));
  };

  const clipAtPlayhead = useMemo(
    () => clips.find((clip) => currentTime > clip.startTime && currentTime < clip.endTime) ?? null,
    [clips, currentTime]
  );

  /** Splits the clip under the playhead in two at the current time. */
  const splitAtPlayhead = () => {
    if (!clipAtPlayhead) return;
    if (
      currentTime - clipAtPlayhead.startTime < MIN_CLIP_LENGTH ||
      clipAtPlayhead.endTime - currentTime < MIN_CLIP_LENGTH
    ) {
      return;
    }

    const tail = {
      ...clipAtPlayhead,
      id: nanoid(),
      startTime: currentTime
    };
    updateClip(clipAtPlayhead.id, { endTime: currentTime });
    addClip(tail);
    setSelectedClipId(tail.id);
  };

  /** Adds a clip from the playhead to the end of the video (or the whole clip). */
  const addClipAtPlayhead = () => {
    if (!videoUrl || duration <= 0) return;

    const start = clips.length === 0 ? 0 : Math.min(currentTime, Math.max(0, duration - MIN_CLIP_LENGTH));
    const end = duration;
    if (end - start < MIN_CLIP_LENGTH) return;

    const clip = {
      id: nanoid(),
      url: videoUrl,
      startTime: start,
      endTime: end,
      type: 'video' as const
    };
    addClip(clip);
    setSelectedClipId(clip.id);
  };

  const canSplit = Boolean(
    clipAtPlayhead &&
      currentTime - clipAtPlayhead.startTime >= MIN_CLIP_LENGTH &&
      clipAtPlayhead.endTime - currentTime >= MIN_CLIP_LENGTH
  );

  // The ruler gets one tick per second for short clips, fewer for long ones.
  const tickStep = duration > 0 ? Math.max(1, Math.ceil(duration / 20)) : 1;
  const ticks = duration > 0 ? Math.floor(duration / tickStep) + 1 : 0;
  const percent = (time: number) => (duration > 0 ? (time / duration) * 100 : 0);

  return (
    <div className="bg-gray-900 text-white p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={goToPrevious}
            disabled={duration <= 0}
            title="Jump to the previous edit point"
            className="p-2 hover:bg-gray-800 rounded-lg disabled:opacity-40"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
          <button
            onClick={goToNext}
            disabled={duration <= 0}
            title="Jump to the next edit point"
            className="p-2 hover:bg-gray-800 rounded-lg disabled:opacity-40"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={splitAtPlayhead}
            disabled={!canSplit}
            title={canSplit ? 'Split the clip at the playhead' : 'Move the playhead inside a clip to split it'}
            className="p-2 hover:bg-gray-800 rounded-lg disabled:opacity-40"
          >
            <Scissors className="w-5 h-5" />
          </button>
          <button
            onClick={addClipAtPlayhead}
            disabled={!videoUrl || duration <= 0}
            title={videoUrl ? 'Add a clip from the playhead to the end' : 'Load a video first'}
            className="p-2 hover:bg-gray-800 rounded-lg disabled:opacity-40"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={() => selectedClipId && removeClip(selectedClipId)}
            disabled={!selectedClipId}
            title="Delete the selected clip"
            className="p-2 hover:bg-gray-800 rounded-lg text-red-400 disabled:opacity-40"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div 
        ref={timelineRef}
        className="relative h-32 bg-gray-800 rounded-lg overflow-hidden cursor-pointer"
        onClick={handleTimelineClick}
      >
        {/* Time markers */}
        <div className="absolute top-0 left-0 w-full h-6 flex">
          {Array.from({ length: ticks }).map((_, i) => (
            <div 
              key={i}
              className="flex-1 border-r border-gray-700 text-xs p-1"
            >
              {formatTime(i * tickStep)}
            </div>
          ))}
        </div>

        {/* Clips */}
        <div className="absolute top-6 left-0 w-full h-12">
          {clips.map((clip) => (
            <button
              key={clip.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedClipId(clip.id === selectedClipId ? null : clip.id);
                seek(clip.startTime);
              }}
              title={`${formatTime(clip.startTime)} - ${formatTime(clip.endTime)}`}
              className={`absolute h-full rounded border ${
                clip.id === selectedClipId
                  ? 'bg-blue-500 border-white'
                  : 'bg-blue-600 border-transparent hover:bg-blue-500'
              }`}
              style={{
                left: `${percent(clip.startTime)}%`,
                width: `${Math.max(0.5, percent(clip.endTime - clip.startTime))}%`
              }}
            />
          ))}
          {clips.length === 0 && (
            <div className="h-full flex items-center justify-center text-xs text-gray-400">
              {videoUrl
                ? 'No clips yet — press + to add one from the playhead.'
                : 'Load a video to start building a timeline.'}
            </div>
          )}
        </div>

        {/* Chapters */}
        <div className="absolute top-20 left-0 w-full h-4">
          {chapters.map((chapter) => (
            <div
              key={chapter.id}
              className="absolute w-0.5 h-full bg-green-500"
              style={{
                left: `${percent(chapter.time)}%`
              }}
            >
              <div className="absolute top-full mt-1 text-xs transform -translate-x-1/2">
                {chapter.title}
              </div>
            </div>
          ))}
        </div>

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500"
          style={{
            left: `${percent(currentTime)}%`
          }}
        />
      </div>
    </div>
  );
};
