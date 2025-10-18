import type { VoiceCommand, Position } from '../types';

// ElevenLabs API configuration
const ELEVENLABS_API_KEY = 'YOUR_API_KEY'; // In production, this would be an environment variable
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Voice IDs for different voices (you can change these)
const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice
const MODEL_ID = 'eleven_monolingual_v1';

// Mock mode for POC
const MOCK_MODE = true;

// Define the SpeechRecognition interface
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
}

interface ISpeechRecognitionConstructor {
  new(): ISpeechRecognition;
}

interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

class VoiceService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private recognition: ISpeechRecognition | null = null;

  constructor() {
    // Initialize speech recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as Window & { 
        SpeechRecognition?: ISpeechRecognitionConstructor;
        webkitSpeechRecognition?: ISpeechRecognitionConstructor;
      }).SpeechRecognition || (window as Window & { 
        SpeechRecognition?: ISpeechRecognitionConstructor;
        webkitSpeechRecognition?: ISpeechRecognitionConstructor;
      }).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
      }
    }
  }

  // Start recording voice input
  async startRecording(): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Voice recording is not supported in this browser');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.start();
      this.isRecording = true;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  // Stop recording and return the audio blob
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.audioChunks = [];
        this.isRecording = false;
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    });
  }

  // Use browser's speech recognition API for voice-to-text
  async recognizeSpeech(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      this.recognition.onresult = (event: Event) => {
        const speechEvent = event as SpeechRecognitionEvent;
        const transcript = speechEvent.results[0][0].transcript;
        resolve(transcript);
      };

      this.recognition.onerror = (event: Event) => {
        const errorEvent = event as SpeechRecognitionErrorEvent;
        reject(new Error(`Speech recognition error: ${errorEvent.error}`));
      };

      this.recognition.start();
    });
  }

  // Parse voice command to extract intent
  parseCommand(text: string): VoiceCommand {
    const lowerText = text.toLowerCase();
    
    // Portfolio queries
    if (lowerText.includes('portfolio') || lowerText.includes('holdings') || lowerText.includes('positions')) {
      if (lowerText.includes('value') || lowerText.includes('worth') || lowerText.includes('total')) {
        return {
          text,
          type: 'query',
          parameters: { query: 'portfolio_value' }
        };
      }
      if (lowerText.includes('gain') || lowerText.includes('loss') || lowerText.includes('profit')) {
        return {
          text,
          type: 'query',
          parameters: { query: 'portfolio_gains' }
        };
      }
      return {
        text,
        type: 'query',
        parameters: { query: 'portfolio_summary' }
      };
    }

    // Stock price queries
    if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('trading at')) {
      const symbols = this.extractStockSymbols(text);
      if (symbols.length > 0) {
        return {
          text,
          type: 'query',
          parameters: { query: 'stock_price', symbols }
        };
      }
    }

    // Position queries
    if (lowerText.includes('how many shares') || lowerText.includes('position in')) {
      const symbols = this.extractStockSymbols(text);
      if (symbols.length > 0) {
        return {
          text,
          type: 'query',
          parameters: { query: 'position_info', symbols }
        };
      }
    }

    // Best/worst performers
    if (lowerText.includes('best') || lowerText.includes('top') || lowerText.includes('winner')) {
      return {
        text,
        type: 'query',
        parameters: { query: 'top_performers' }
      };
    }
    if (lowerText.includes('worst') || lowerText.includes('loser') || lowerText.includes('down')) {
      return {
        text,
        type: 'query',
        parameters: { query: 'worst_performers' }
      };
    }

    // Market status
    if (lowerText.includes('market') && (lowerText.includes('open') || lowerText.includes('closed'))) {
      return {
        text,
        type: 'query',
        parameters: { query: 'market_status' }
      };
    }

    // Default
    return {
      text,
      type: 'query',
      parameters: { query: 'unknown' }
    };
  }

  // Extract stock symbols from text
  private extractStockSymbols(text: string): string[] {
    const symbols: string[] = [];
    const words = text.toUpperCase().split(' ');
    
    // Common stock symbols to check for
    const knownSymbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM'];
    
    // Also check for company names
    const companyMap: Record<string, string> = {
      'APPLE': 'AAPL',
      'GOOGLE': 'GOOGL',
      'ALPHABET': 'GOOGL',
      'MICROSOFT': 'MSFT',
      'AMAZON': 'AMZN',
      'TESLA': 'TSLA',
      'META': 'META',
      'FACEBOOK': 'META',
      'NVIDIA': 'NVDA',
      'JPMORGAN': 'JPM',
      'CHASE': 'JPM'
    };

    for (const word of words) {
      // Check if it's a known symbol
      if (knownSymbols.includes(word)) {
        symbols.push(word);
      }
      // Check if it's a company name
      else if (companyMap[word]) {
        symbols.push(companyMap[word]);
      }
      // Check if it looks like a stock symbol (2-5 uppercase letters)
      else if (/^[A-Z]{2,5}$/.test(word)) {
        symbols.push(word);
      }
    }

    return [...new Set(symbols)]; // Remove duplicates
  }

  // Convert text to speech using ElevenLabs API
  async textToSpeech(text: string): Promise<ArrayBuffer> {
    if (MOCK_MODE) {
      // In mock mode, use browser's speech synthesis
      return this.browserTextToSpeech(text);
    }

    try {
      const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${VOICE_ID}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text,
          model_id: MODEL_ID,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error('Error generating speech:', error);
      // Fallback to browser TTS
      return this.browserTextToSpeech(text);
    }
  }

  // Fallback to browser's speech synthesis
  private async browserTextToSpeech(text: string): Promise<ArrayBuffer> {
    return new Promise((resolve) => {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        window.speechSynthesis.speak(utterance);
        
        // Return empty ArrayBuffer since browser handles playback
        resolve(new ArrayBuffer(0));
      } else {
        console.error('Speech synthesis not supported');
        resolve(new ArrayBuffer(0));
      }
    });
  }

  // Play audio from ArrayBuffer
  async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    if (audioBuffer.byteLength === 0) {
      // Browser TTS handles playback internally
      return;
    }

    const audioContext = new ((window as typeof window & { webkitAudioContext?: typeof AudioContext }).AudioContext || 
                             (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    const source = audioContext.createBufferSource();
    
    try {
      const decodedAudio = await audioContext.decodeAudioData(audioBuffer);
      source.buffer = decodedAudio;
      source.connect(audioContext.destination);
      source.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  }

  // Generate voice response based on query
  generateResponse(command: VoiceCommand, data: {
    portfolio?: {
      totalValue: number;
      totalCash: number;
      totalInvested: number;
      dayChange: number;
      dayChangePercent: number;
      positions: Position[];
    };
    stocks?: Array<{
      name: string;
      price: number;
      change: number;
      changePercent: number;
    }>;
    position?: Position;
    positions?: Position[];
  }): string {
    const params = command.parameters || {};
    
    switch (params.query) {
      case 'portfolio_value':
        if (data.portfolio) {
          return `Your portfolio is currently worth $${data.portfolio.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. 
                  You have $${data.portfolio.totalCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in cash 
                  and $${data.portfolio.totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} invested.`;
        }
        return 'Unable to fetch portfolio value at this time.';

      case 'portfolio_gains':
        if (data.portfolio) {
          const isGain = data.portfolio.dayChange >= 0;
          return `Your portfolio is ${isGain ? 'up' : 'down'} $${Math.abs(data.portfolio.dayChange).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                  or ${Math.abs(data.portfolio.dayChangePercent).toFixed(2)}% today.`;
        }
        return 'Unable to fetch portfolio gains at this time.';

      case 'portfolio_summary':
        if (data.portfolio) {
          const topPosition = data.portfolio.positions.reduce((max: Position, pos: Position) => 
            pos.gainLossPercent > max.gainLossPercent ? pos : max
          );
          return `You have ${data.portfolio.positions.length} positions in your portfolio worth $${data.portfolio.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. 
                  Your best performer is ${topPosition.name} with a gain of ${topPosition.gainLossPercent.toFixed(2)}%.`;
        }
        return 'Unable to fetch portfolio summary at this time.';

      case 'stock_price':
        if (data.stocks && data.stocks.length > 0) {
          const stock = data.stocks[0];
          const change = stock.change >= 0 ? 'up' : 'down';
          return `${stock.name} is currently trading at $${stock.price.toFixed(2)}, ${change} $${Math.abs(stock.change).toFixed(2)} or ${Math.abs(stock.changePercent).toFixed(2)}% today.`;
        }
        return 'Unable to fetch stock price at this time.';

      case 'position_info':
        if (data.position) {
          const gainLoss = data.position.gainLoss >= 0 ? 'gain' : 'loss';
          return `You own ${data.position.shares} shares of ${data.position.name} worth $${data.position.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, 
                  with a ${gainLoss} of $${Math.abs(data.position.gainLoss).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} or ${Math.abs(data.position.gainLossPercent).toFixed(2)}%.`;
        }
        return 'You do not have a position in that stock.';

      case 'top_performers':
        if (data.positions && data.positions.length > 0) {
          const top3 = data.positions
            .sort((a: Position, b: Position) => b.gainLossPercent - a.gainLossPercent)
            .slice(0, 3);
          const response = top3.map((pos: Position, i: number) => 
            `${i + 1}. ${pos.name} up ${pos.gainLossPercent.toFixed(2)}%`
          ).join(', ');
          return `Your top performers today are: ${response}`;
        }
        return 'Unable to fetch top performers at this time.';

      case 'worst_performers':
        if (data.positions && data.positions.length > 0) {
          const worst3 = data.positions
            .sort((a: Position, b: Position) => a.gainLossPercent - b.gainLossPercent)
            .slice(0, 3);
          const response = worst3.map((pos: Position, i: number) => 
            `${i + 1}. ${pos.name} down ${Math.abs(pos.gainLossPercent).toFixed(2)}%`
          ).join(', ');
          return `Your worst performers today are: ${response}`;
        }
        return 'Unable to fetch worst performers at this time.';

      case 'market_status': {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        const isWeekday = day >= 1 && day <= 5;
        const isMarketHours = hour >= 9.5 && hour < 16; // 9:30 AM to 4:00 PM ET
        
        if (isWeekday && isMarketHours) {
          return 'The market is currently open. Trading hours are 9:30 AM to 4:00 PM Eastern Time.';
        } else {
          return 'The market is currently closed. Trading hours are 9:30 AM to 4:00 PM Eastern Time, Monday through Friday.';
        }
      }

      default:
        return "I can help you with portfolio queries, stock prices, and position information. Please note that I cannot provide financial advice. How can I help you today?";
    }
  }
}

export default new VoiceService();
