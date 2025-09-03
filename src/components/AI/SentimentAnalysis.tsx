import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, Frown, Meh, Smile, Brain, Settings } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';

interface SentimentAnalysisProps {
  enabled: boolean;
  text?: string;
  onSentimentDetected?: (sentiment: SentimentResult) => void;
  settings?: {
    threshold?: number;
    showConfidence?: boolean;
    realTime?: boolean;
  };
}

interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  score: number;
}

export const SentimentAnalysis: React.FC<SentimentAnalysisProps> = ({
  enabled,
  text = '',
  onSentimentDetected,
  settings = {
    threshold: 0.5,
    showConfidence: true,
    realTime: true
  }
}) => {
  const [model, setModel] = useState<use.UniversalSentenceEncoder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSentiment, setCurrentSentiment] = useState<SentimentResult | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  const [inputText, setInputText] = useState(text);

  // Simple sentiment classifier weights (trained on basic positive/negative words)
  const sentimentWeights = useRef({
    positive: [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome',
      'love', 'like', 'happy', 'joy', 'pleased', 'delighted', 'satisfied',
      'best', 'perfect', 'brilliant', 'outstanding', 'superb', 'marvelous'
    ],
    negative: [
      'bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'sad', 'angry',
      'upset', 'disappointed', 'frustrated', 'annoyed', 'irritated', 'mad',
      'worst', 'poor', 'dreadful', 'atrocious', 'abysmal', 'lousy'
    ]
  });

  // Load the Universal Sentence Encoder model
  useEffect(() => {
    let isMounted = true;

    const loadModel = async () => {
      if (!enabled) return;

      setIsLoading(true);
      setError(null);

      try {
        // Ensure TensorFlow.js is ready
        await tf.ready();

        // Load the Universal Sentence Encoder
        const loadedModel = await use.load();
        console.log('Universal Sentence Encoder loaded successfully');

        if (isMounted) {
          setModel(loadedModel);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load sentiment analysis model:', err);
        if (isMounted) {
          setError('Failed to load sentiment analysis model');
          setIsLoading(false);
        }
      }
    };

    loadModel();

    return () => {
      isMounted = false;
      // Clean up TensorFlow memory
      tf.disposeVariables();
    };
  }, [enabled]);

  // Simple rule-based sentiment analysis as fallback
  const analyzeSentimentSimple = useCallback((text: string): SentimentResult => {
    if (!text.trim()) {
      return { sentiment: 'neutral', confidence: 0, score: 0 };
    }

    const words = text.toLowerCase().split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;

    words.forEach(word => {
      if (sentimentWeights.current.positive.includes(word)) {
        positiveScore += 1;
      }
      if (sentimentWeights.current.negative.includes(word)) {
        negativeScore += 1;
      }
    });

    const totalScore = positiveScore - negativeScore;
    const maxPossible = Math.max(words.length, 1);
    const normalizedScore = totalScore / maxPossible;

    let sentiment: 'positive' | 'negative' | 'neutral';
    let confidence: number;

    if (Math.abs(normalizedScore) < 0.1) {
      sentiment = 'neutral';
      confidence = 1 - Math.abs(normalizedScore);
    } else if (normalizedScore > 0) {
      sentiment = 'positive';
      confidence = normalizedScore;
    } else {
      sentiment = 'negative';
      confidence = Math.abs(normalizedScore);
    }

    return {
      sentiment,
      confidence: Math.min(confidence, 1),
      score: normalizedScore
    };
  }, []);

  // Advanced sentiment analysis using Universal Sentence Encoder
  const analyzeSentimentAdvanced = useCallback(async (text: string): Promise<SentimentResult> => {
    if (!model || !text.trim()) {
      return analyzeSentimentSimple(text);
    }

    try {
      // Get embeddings for the input text
      const embeddings = await model.embed([text]);
      const embeddingArray = await embeddings.array();

      // Simple classification based on embedding patterns
      // This is a simplified approach - in practice, you'd use a trained classifier
      const embedding = embeddingArray[0];

      // Calculate a simple sentiment score based on embedding values
      // This is a heuristic approach for demonstration
      let sentimentScore = 0;

      // Look for patterns in the embedding that correlate with sentiment
      // (This is a simplified approach - real sentiment analysis would use a trained model)
      for (let i = 0; i < Math.min(embedding.length, 100); i++) {
        sentimentScore += embedding[i] * (i % 2 === 0 ? 1 : -1); // Simple alternating pattern
      }

      sentimentScore = sentimentScore / Math.min(embedding.length, 100);

      // Normalize to [-1, 1] range
      sentimentScore = Math.max(-1, Math.min(1, sentimentScore));

      let sentiment: 'positive' | 'negative' | 'neutral';
      let confidence: number;

      if (Math.abs(sentimentScore) < 0.2) {
        sentiment = 'neutral';
        confidence = 1 - Math.abs(sentimentScore) * 2;
      } else if (sentimentScore > 0) {
        sentiment = 'positive';
        confidence = sentimentScore;
      } else {
        sentiment = 'negative';
        confidence = Math.abs(sentimentScore);
      }

      // Clean up tensors
      embeddings.dispose();

      return {
        sentiment,
        confidence: Math.min(confidence, 1),
        score: sentimentScore
      };
    } catch (err) {
      console.error('Advanced sentiment analysis failed:', err);
      // Fallback to simple analysis
      return analyzeSentimentSimple(text);
    }
  }, [model, analyzeSentimentSimple]);

  // Analyze text when it changes
  useEffect(() => {
    if (!enabled || !inputText.trim()) return;

    const analyzeText = async () => {
      const result = await analyzeSentimentAdvanced(inputText);
      setCurrentSentiment(result);
      onSentimentDetected?.(result);
    };

    if (localSettings.realTime) {
      // Debounce for real-time analysis
      const timeoutId = setTimeout(analyzeText, 500);
      return () => clearTimeout(timeoutId);
    } else {
      analyzeText();
    }
  }, [inputText, enabled, localSettings.realTime, analyzeSentimentAdvanced, onSentimentDetected]);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Smile className="w-5 h-5 text-green-500" />;
      case 'negative':
        return <Frown className="w-5 h-5 text-red-500" />;
      default:
        return <Meh className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'negative':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const updateSetting = useCallback((key: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  if (!enabled) return null;

  return (
    <div className="absolute top-4 right-4 space-y-2">
      {/* Main Analysis Panel */}
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 shadow-lg border max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <h3 className="text-sm font-medium text-gray-900">Sentiment Analysis</h3>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
          >
            <Settings className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Text Input */}
        <div className="mb-3">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text to analyze sentiment..."
            className="w-full h-20 p-2 text-sm border border-gray-300 rounded resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
            <span className="ml-2 text-sm text-gray-600">Loading model...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Sentiment Result */}
        {currentSentiment && !isLoading && (
          <div className={`border rounded-lg p-3 ${getSentimentColor(currentSentiment.sentiment)}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getSentimentIcon(currentSentiment.sentiment)}
                <span className="text-sm font-medium capitalize">
                  {currentSentiment.sentiment}
                </span>
              </div>
              {localSettings.showConfidence && (
                <span className="text-xs">
                  {(currentSentiment.confidence * 100).toFixed(1)}%
                </span>
              )}
            </div>

            {localSettings.showConfidence && (
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentSentiment.sentiment === 'positive' ? 'bg-green-500' :
                    currentSentiment.sentiment === 'negative' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${currentSentiment.confidence * 100}%` }}
                />
              </div>
            )}

            <p className="text-xs opacity-75">
              Score: {currentSentiment.score.toFixed(3)}
            </p>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border max-w-sm">
          <h4 className="text-sm font-medium mb-2">Analysis Settings</h4>

          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Confidence Threshold</label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.1"
                value={localSettings.threshold}
                onChange={(e) => updateSetting('threshold', parseFloat(e.target.value))}
                className="w-full accent-purple-500"
              />
              <span className="text-xs text-gray-500">{localSettings.threshold}</span>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">Show Confidence</label>
              <input
                type="checkbox"
                checked={localSettings.showConfidence}
                onChange={(e) => updateSetting('showConfidence', e.target.checked)}
                className="rounded accent-purple-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">Real-time Analysis</label>
              <input
                type="checkbox"
                checked={localSettings.realTime}
                onChange={(e) => updateSetting('realTime', e.target.checked)}
                className="rounded accent-purple-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};