// Previous imports remain the same...

export const VideoDownloader: React.FC<VideoDownloaderProps> = ({
  videoBlob,
  onClose,
  isOpen
}) => {
  // Previous state declarations remain the same...

  const handleExport = async () => {
    if (!videoBlob) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const ffmpeg = new FFmpeg();
      
      // Load FFmpeg with proper error handling
      try {
        await ffmpeg.load({
          coreURL: '/node_modules/@ffmpeg/core/dist/ffmpeg-core.js',
          wasmURL: '/node_modules/@ffmpeg/core/dist/ffmpeg-core.wasm'
        });
      } catch (loadError) {
        console.error('Failed to load FFmpeg:', loadError);
        throw new Error('Failed to initialize video processing. Please try again.');
      }

      ffmpeg.on('progress', ({ progress }) => {
        setProgress(Math.round(progress * 100));
      });

      // Create a unique filename to avoid conflicts
      const timestamp = Date.now();
      const inputFileName = `input-${timestamp}.webm`;
      const format = exportFormats.find(f => f.id === selectedFormat);
      const size = exportSizes.find(s => s.id === selectedSize);
      
      try {
        await ffmpeg.writeFile(inputFileName, await fetchFile(videoBlob));
      } catch (writeError) {
        console.error('Failed to write input file:', writeError);
        throw new Error('Failed to process video file. Please try again.');
      }

      const outputFileName = `output-${timestamp}.${format?.extension}`;
      const scaleFilter = size?.width ? 
        `scale=${size.width}:${size.height}:force_original_aspect_ratio=decrease,pad=${size.width}:${size.height}:(ow-iw)/2:(oh-ih)/2` : '';

      let ffmpegCommand: string[] = [];

      // Rest of the ffmpeg command generation remains the same...

      try {
        await ffmpeg.exec(ffmpegCommand);
      } catch (execError) {
        console.error('FFmpeg execution failed:', execError);
        throw new Error('Video processing failed. Please try a different format or size.');
      }

      try {
        const data = await ffmpeg.readFile(outputFileName);
        const url = URL.createObjectURL(
          new Blob([data.buffer], { type: `video/${format?.extension}` })
        );

        const a = document.createElement('a');
        a.href = url;
        a.download = `video_${size?.name.toLowerCase().replace(' ', '_')}.${format?.extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (readError) {
        console.error('Failed to read output file:', readError);
        throw new Error('Failed to save the processed video. Please try again.');
      }

    } catch (error) {
      console.error('Export failed:', error);
      // Show error to user (you can add a toast notification here)
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  // Rest of the component remains the same...
}