import React, { useState, useEffect } from 'react';
import { 
  Video, Search, Filter, Clock, Calendar, Trash2, Edit2, Download, 
  Play, Grid, List, ChevronDown, MoreHorizontal, Star, StarOff, 
  Copy, Share2, Folder, Plus, Film, ArrowUp, ArrowDown, Eye, Settings,
  X, ArrowLeft, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from '../ui/Tooltip';

interface Recording {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  size: number; // in bytes
  resolution: string;
  date: Date;
  format: string;
  favorite: boolean;
  tags: string[];
  folder: string | null;
  url: string; // URL to the recording
}

interface RecordingsLibraryProps {
  onBackToRecorder: () => void;
  onEditRecording?: (recordingId: string) => void;
}

const RecordingsLibrary: React.FC<RecordingsLibraryProps> = ({ 
  onBackToRecorder,
  onEditRecording 
}) => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [filteredRecordings, setFilteredRecordings] = useState<Recording[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'duration' | 'size'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [playingRecording, setPlayingRecording] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const [folders, setFolders] = useState<string[]>(['Projects', 'Tutorials', 'Personal']);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const recordingsPerPage = 6;
  
  // Mock data for demonstration
  useEffect(() => {
    const mockRecordings: Recording[] = [
      {
        id: '1',
        title: 'Tutorial on AI Recording Features',
        thumbnail: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
        duration: 285, // 4:45
        size: 24500000, // 24.5 MB
        resolution: '1920x1080',
        date: new Date('2024-05-10T14:30:00'),
        format: 'mp4',
        favorite: true,
        tags: ['tutorial', 'ai', 'features'],
        folder: 'Tutorials',
        url: '#'
      },
      {
        id: '2',
        title: 'Screen Recording - Project Demo',
        thumbnail: 'https://images.pexels.com/photos/577585/pexels-photo-577585.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
        duration: 540, // 9:00
        size: 52000000, // 52 MB
        resolution: '3840x2160',
        date: new Date('2024-05-08T10:15:00'),
        format: 'webm',
        favorite: false,
        tags: ['project', 'demo', 'client'],
        folder: 'Projects',
        url: '#'
      },
      {
        id: '3',
        title: 'Background Removal Demo',
        thumbnail: 'https://images.pexels.com/photos/7048022/pexels-photo-7048022.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
        duration: 180, // 3:00
        size: 15000000, // 15 MB
        resolution: '1920x1080',
        date: new Date('2024-05-05T16:45:00'),
        format: 'mp4',
        favorite: true,
        tags: ['background', 'ai', 'effects'],
        folder: 'Tutorials',
        url: '#'
      },
      {
        id: '4',
        title: 'Team Meeting',
        thumbnail: 'https://images.pexels.com/photos/7651922/pexels-photo-7651922.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
        duration: 1800, // 30:00
        size: 75000000, // 75 MB
        resolution: '1280x720',
        date: new Date('2024-05-02T09:30:00'),
        format: 'mp4',
        favorite: false,
        tags: ['meeting', 'team'],
        folder: null,
        url: '#'
      },
      {
        id: '5',
        title: 'PiP Mode Demonstration',
        thumbnail: 'https://images.pexels.com/photos/8430328/pexels-photo-8430328.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
        duration: 420, // 7:00
        size: 38000000, // 38 MB
        resolution: '1920x1080',
        date: new Date('2024-05-01T13:20:00'),
        format: 'webm',
        favorite: false,
        tags: ['pip', 'feature', 'demo'],
        folder: 'Personal',
        url: '#'
      },
      {
        id: '6',
        title: 'Product Tutorial',
        thumbnail: 'https://images.pexels.com/photos/5082562/pexels-photo-5082562.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
        duration: 720, // 12:00
        size: 45000000, // 45 MB
        resolution: '1920x1080',
        date: new Date('2024-04-28T11:10:00'),
        format: 'mp4',
        favorite: true,
        tags: ['product', 'tutorial'],
        folder: 'Projects',
        url: '#'
      },
      {
        id: '7',
        title: 'Face Detection Test',
        thumbnail: 'https://images.pexels.com/photos/5384445/pexels-photo-5384445.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
        duration: 145, // 2:25
        size: 12000000, // 12 MB
        resolution: '1280x720',
        date: new Date('2024-04-25T15:40:00'),
        format: 'mp4',
        favorite: false,
        tags: ['ai', 'face-detection', 'test'],
        folder: 'Tutorials',
        url: '#'
      },
      {
        id: '8',
        title: 'Marketing Video Draft',
        thumbnail: 'https://images.pexels.com/photos/1181316/pexels-photo-1181316.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
        duration: 510, // 8:30
        size: 48000000, // 48 MB
        resolution: '1920x1080',
        date: new Date('2024-04-22T09:15:00'),
        format: 'mp4',
        favorite: true,
        tags: ['marketing', 'draft'],
        folder: 'Projects',
        url: '#'
      }
    ];

    setRecordings(mockRecordings);
    setFilteredRecordings(mockRecordings);
  }, []);

  // Filter recordings based on search, folder, and format
  useEffect(() => {
    let filtered = [...recordings];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        rec => rec.title.toLowerCase().includes(query) || 
               rec.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Apply folder filter
    if (selectedFolder) {
      filtered = filtered.filter(rec => rec.folder === selectedFolder);
    }
    
    // Apply format filter
    if (selectedFormat) {
      filtered = filtered.filter(rec => rec.format === selectedFormat);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = a.date.getTime() - b.date.getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'duration':
          comparison = a.duration - b.duration;
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    setFilteredRecordings(filtered);
  }, [recordings, searchQuery, sortBy, sortDirection, selectedFolder, selectedFormat]);

  // Get paginated recordings
  const paginatedRecordings = filteredRecordings.slice(
    (page - 1) * recordingsPerPage,
    page * recordingsPerPage
  );

  const pageCount = Math.ceil(filteredRecordings.length / recordingsPerPage);

  const toggleFavorite = (id: string) => {
    setRecordings(recordings.map(rec => 
      rec.id === id ? { ...rec, favorite: !rec.favorite } : rec
    ));
  };

  const deleteRecording = (id: string) => {
    if (window.confirm('Are you sure you want to delete this recording?')) {
      setRecordings(recordings.filter(rec => rec.id !== id));
      if (selectedRecording === id) {
        setSelectedRecording(null);
      }
      if (playingRecording === id) {
        setPlayingRecording(null);
        setPreviewUrl(null);
      }
    }
  };

  const assignToFolder = (id: string, folder: string | null) => {
    setRecordings(recordings.map(rec => 
      rec.id === id ? { ...rec, folder } : rec
    ));
  };

  const toggleSort = (sort: 'date' | 'title' | 'duration' | 'size') => {
    if (sortBy === sort) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(sort);
      setSortDirection('desc');
    }
    setShowSortMenu(false);
  };

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const playRecording = (id: string) => {
    const recording = recordings.find(rec => rec.id === id);
    if (recording) {
      setPlayingRecording(id);
      setPreviewUrl(recording.url);
    }
  };

  const addNewFolder = () => {
    const folderName = prompt('Enter new folder name:');
    if (folderName && !folders.includes(folderName)) {
      setFolders([...folders, folderName]);
    }
  };

  const exportSelected = () => {
    if (!selectedRecording) return;
    
    const recording = recordings.find(rec => rec.id === selectedRecording);
    if (recording) {
      // In a real application, this would trigger a download
      alert(`Exporting ${recording.title}`);
    }
  };

  const editRecording = (id: string) => {
    if (onEditRecording) {
      onEditRecording(id);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button 
            onClick={onBackToRecorder}
            className="mr-3 p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold">My Recordings</h2>
        </div>
        <button 
          onClick={onBackToRecorder}
          className="flex items-center space-x-2 px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] shadow-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Recording</span>
        </button>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search recordings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border rounded-lg"
          />
        </div>

        <div className="flex space-x-2">
          <div className="relative">
            <Tooltip content="Filter recordings">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`p-2 rounded-lg ${showFilterMenu ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'bg-white hover:bg-gray-50'}`}
              >
                <Filter className="w-5 h-5" />
              </button>
            </Tooltip>
            
            <AnimatePresence>
              {showFilterMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-10"
                >
                  <div className="p-2">
                    <div className="p-2 font-medium text-sm">Format</div>
                    <div className="space-y-1">
                      <button
                        className={`w-full text-left px-3 py-1.5 rounded text-sm ${selectedFormat === null ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'}`}
                        onClick={() => setSelectedFormat(null)}
                      >
                        All Formats
                      </button>
                      <button
                        className={`w-full text-left px-3 py-1.5 rounded text-sm ${selectedFormat === 'mp4' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'}`}
                        onClick={() => setSelectedFormat('mp4')}
                      >
                        MP4
                      </button>
                      <button
                        className={`w-full text-left px-3 py-1.5 rounded text-sm ${selectedFormat === 'webm' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'}`}
                        onClick={() => setSelectedFormat('webm')}
                      >
                        WebM
                      </button>
                    </div>
                    
                    <div className="mt-2 border-t pt-2">
                      <div className="p-2 font-medium text-sm">Show Only</div>
                      <div className="space-y-1">
                        <button
                          className="w-full text-left px-3 py-1.5 rounded text-sm hover:bg-gray-100 flex items-center"
                        >
                          <Star className="w-4 h-4 mr-2 text-yellow-500" />
                          Favorites
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="relative">
            <Tooltip content="Sort recordings">
              <button
                onClick={() => setShowSortMenu(!showSortMenu)}
                className={`p-2 rounded-lg ${showSortMenu ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'bg-white hover:bg-gray-50'}`}
              >
                <Clock className="w-5 h-5" />
              </button>
            </Tooltip>
            
            <AnimatePresence>
              {showSortMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-10"
                >
                  <div className="p-2 space-y-1">
                    <button
                      className={`w-full text-left px-3 py-1.5 rounded text-sm ${sortBy === 'date' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'}`}
                      onClick={() => toggleSort('date')}
                    >
                      <div className="flex justify-between items-center">
                        <span>Date {sortBy === 'date' && (sortDirection === 'asc' ? '(Oldest)' : '(Newest)')}</span>
                        {sortBy === 'date' && (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>
                    <button
                      className={`w-full text-left px-3 py-1.5 rounded text-sm ${sortBy === 'title' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'}`}
                      onClick={() => toggleSort('title')}
                    >
                      <div className="flex justify-between items-center">
                        <span>Title {sortBy === 'title' && (sortDirection === 'asc' ? '(A-Z)' : '(Z-A)')}</span>
                        {sortBy === 'title' && (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>
                    <button
                      className={`w-full text-left px-3 py-1.5 rounded text-sm ${sortBy === 'duration' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'}`}
                      onClick={() => toggleSort('duration')}
                    >
                      <div className="flex justify-between items-center">
                        <span>Duration {sortBy === 'duration' && (sortDirection === 'asc' ? '(Shortest)' : '(Longest)')}</span>
                        {sortBy === 'duration' && (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>
                    <button
                      className={`w-full text-left px-3 py-1.5 rounded text-sm ${sortBy === 'size' ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'}`}
                      onClick={() => toggleSort('size')}
                    >
                      <div className="flex justify-between items-center">
                        <span>Size {sortBy === 'size' && (sortDirection === 'asc' ? '(Smallest)' : '(Largest)')}</span>
                        {sortBy === 'size' && (
                          sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="relative">
            <Tooltip content="Folders">
              <button
                onClick={() => setShowFolderMenu(!showFolderMenu)}
                className={`p-2 rounded-lg ${showFolderMenu ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'bg-white hover:bg-gray-50'}`}
              >
                <Folder className="w-5 h-5" />
              </button>
            </Tooltip>
            
            <AnimatePresence>
              {showFolderMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-10"
                >
                  <div className="p-2 space-y-1">
                    <button
                      className={`w-full text-left px-3 py-1.5 rounded text-sm ${selectedFolder === null ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'}`}
                      onClick={() => setSelectedFolder(null)}
                    >
                      All Recordings
                    </button>
                    
                    {folders.map(folder => (
                      <button
                        key={folder}
                        className={`w-full text-left px-3 py-1.5 rounded text-sm ${selectedFolder === folder ? 'bg-[#E44E51]/10 text-[#E44E51]' : 'hover:bg-gray-100'}`}
                        onClick={() => setSelectedFolder(folder)}
                      >
                        {folder}
                      </button>
                    ))}
                    
                    <div className="border-t pt-1 mt-1">
                      <button
                        className="w-full text-left px-3 py-1.5 rounded text-sm hover:bg-gray-100 text-[#E44E51]"
                        onClick={addNewFolder}
                      >
                        <Plus className="w-4 h-4 inline mr-2" />
                        Add New Folder
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div>
            <Tooltip content="View mode">
              <button 
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 bg-white hover:bg-gray-50 rounded-lg"
              >
                {viewMode === 'grid' ? (
                  <Grid className="w-5 h-5" />
                ) : (
                  <List className="w-5 h-5" />
                )}
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
      
      {/* Folder breadcrumb */}
      {selectedFolder && (
        <div className="mb-4 flex items-center text-sm text-gray-600">
          <button 
            onClick={() => setSelectedFolder(null)}
            className="hover:text-[#E44E51]"
          >
            All Recordings
          </button>
          <ChevronDown className="w-4 h-4 mx-2" />
          <span className="font-medium text-[#E44E51]">{selectedFolder}</span>
        </div>
      )}

      {/* Recordings List/Grid */}
      <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}`}>
        {paginatedRecordings.length > 0 ? (
          paginatedRecordings.map(recording => (
            <div 
              key={recording.id} 
              className={`bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden ${
                viewMode === 'grid' ? '' : 'flex'
              } ${selectedRecording === recording.id ? 'ring-2 ring-[#E44E51]' : ''}`}
              onClick={() => setSelectedRecording(recording.id === selectedRecording ? null : recording.id)}
            >
              {/* Thumbnail/Preview */}
              <div className={`relative ${viewMode === 'grid' ? 'aspect-video' : 'w-48 h-32'}`}>
                <img 
                  src={recording.thumbnail} 
                  alt={recording.title}
                  className="w-full h-full object-cover"
                />
                
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-50 transition-opacity flex items-center justify-center">
                  <button 
                    className="p-2 bg-white rounded-full opacity-0 hover:opacity-100 transform scale-90 hover:scale-100 transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      playRecording(recording.id);
                    }}
                  >
                    <Play className="w-5 h-5 text-gray-900" />
                  </button>
                </div>
                
                {/* Duration badge */}
                <div className="absolute bottom-2 right-2 bg-black/70 text-white px-1.5 py-0.5 rounded text-xs">
                  {formatDuration(recording.duration)}
                </div>
                
                {/* Resolution badge */}
                <div className="absolute bottom-2 left-2 bg-black/70 text-white px-1.5 py-0.5 rounded text-xs">
                  {recording.resolution}
                </div>
              </div>
              
              <div className={`p-4 ${viewMode === 'grid' ? '' : 'flex-1'}`}>
                <div className={`flex justify-between items-start ${viewMode === 'grid' ? '' : 'mb-2'}`}>
                  <h3 className={`font-semibold text-gray-900 ${viewMode === 'grid' ? 'text-lg mb-1' : 'text-xl'}`}>
                    {recording.title}
                  </h3>
                  
                  <div className="flex">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(recording.id);
                      }}
                      className={`p-1 rounded-full ${recording.favorite ? 'text-yellow-500' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {recording.favorite ? <Star className="w-5 h-5" /> : <StarOff className="w-5 h-5" />}
                    </button>
                    
                    <div className="relative ml-1">
                      <Tooltip content="More options">
                        <button 
                          className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Show options menu logic would go here
                          }}
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
                
                {/* Recording details */}
                <div className="flex flex-wrap gap-y-1 text-sm text-gray-500">
                  <div className="flex items-center mr-4">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>{formatDate(recording.date)}</span>
                  </div>
                  
                  <div className="flex items-center mr-4">
                    <Film className="w-4 h-4 mr-1" />
                    <span>{recording.format.toUpperCase()}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <Folder className="w-4 h-4 mr-1" />
                    <span>{recording.folder || 'Uncategorized'}</span>
                  </div>
                  
                  {viewMode === 'list' && (
                    <div className="flex items-center ml-4">
                      <Download className="w-4 h-4 mr-1" />
                      <span>{formatSize(recording.size)}</span>
                    </div>
                  )}
                </div>
                
                {/* Tags */}
                {recording.tags.length > 0 && (
                  <div className={`flex flex-wrap gap-1 ${viewMode === 'grid' ? 'mt-2' : 'mt-3'}`}>
                    {recording.tags.map(tag => (
                      <span 
                        key={tag} 
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Actions for list view */}
                {viewMode === 'list' && (
                  <div className="mt-4 flex space-x-2">
                    <button 
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm flex items-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        playRecording(recording.id);
                      }}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Play
                    </button>
                    
                    <button 
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm flex items-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        editRecording(recording.id);
                      }}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </button>
                    
                    <button 
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm flex items-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRecording(recording.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center">
            <Film className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No recordings found</h3>
            <p className="text-gray-500 mt-1">Try changing your search or filter criteria</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-600">
            Showing {(page - 1) * recordingsPerPage + 1} to {Math.min(page * recordingsPerPage, filteredRecordings.length)} of {filteredRecordings.length} recordings
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-gray-300 disabled:opacity-50"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`w-10 h-10 flex items-center justify-center rounded-lg ${
                  page === pageNum ? 'bg-[#E44E51] text-white' : 'border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {pageNum}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(pageCount, page + 1))}
              disabled={page === pageCount}
              className="p-2 rounded-lg border border-gray-300 disabled:opacity-50"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      <AnimatePresence>
        {playingRecording && previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
            onClick={() => {
              setPlayingRecording(null);
              setPreviewUrl(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative bg-black rounded-lg overflow-hidden max-w-4xl w-full max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="aspect-video">
                <video
                  src={previewUrl}
                  controls
                  autoPlay
                  className="w-full h-full"
                />
              </div>
              <div className="absolute top-2 right-2">
                <button 
                  className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                  onClick={() => {
                    setPlayingRecording(null);
                    setPreviewUrl(null);
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Panel for Selected Recording */}
      <AnimatePresence>
        {selectedRecording && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-6 right-6 left-6 bg-white rounded-lg border border-gray-200 shadow-lg z-10 p-4"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <h3 className="font-medium mr-4">
                  {recordings.find(r => r.id === selectedRecording)?.title}
                </h3>
                <div className="hidden sm:flex text-sm text-gray-500">
                  <span className="mr-4">{formatDuration(recordings.find(r => r.id === selectedRecording)?.duration || 0)}</span>
                  <span>{formatSize(recordings.find(r => r.id === selectedRecording)?.size || 0)}</span>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button 
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 flex items-center"
                  onClick={() => setSelectedRecording(null)}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
                <button 
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 flex items-center"
                  onClick={() => playRecording(selectedRecording)}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Play
                </button>
                <button 
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 flex items-center"
                  onClick={() => {
                    const recording = recordings.find(r => r.id === selectedRecording);
                    if (recording && onEditRecording) {
                      onEditRecording(recording.id);
                    }
                  }}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </button>
                <button 
                  className="px-4 py-2 bg-[#E44E51] text-white rounded-lg hover:bg-[#D43B3E] flex items-center shadow-sm"
                  onClick={exportSelected}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RecordingsLibrary;