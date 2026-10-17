import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Square, Play, Pause, Upload,
  ChevronDown, Loader2, AlertTriangle, Sparkles,
  FileText, Zap, Volume2, RefreshCw, CheckCircle2
} from 'lucide-react';
import { DemoScenario } from '@triagevoice/shared';
import { getScenarios, extractClinicalData, transcribeAudio } from '../services/api';
import { formatDuration } from '../utils/format';
import { HealthStatus } from '../services/api';

interface NewIntakeProps {
  health: HealthStatus | null;
}

type RecordingState = 'idle' | 'requesting' | 'recording' | 'stopped' | 'error';

// Browser Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: ISpeechRecognition, ev: Event) => void) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => void) | null;
}

export function NewIntake({ health }: NewIntakeProps) {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [transcript, setTranscript] = useState('');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeStatus, setTranscribeStatus] = useState<string | null>(null);
  const [transcribeSource, setTranscribeSource] = useState<'live' | 'ai' | 'mock' | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordedBlobRef = useRef<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const speechRecognitionRef = useRef<ISpeechRecognition | null>(null);
  const speechTextAccumulatedRef = useRef<string>('');

  useEffect(() => {
    getScenarios().then(setScenarios).catch(console.error);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch { /* ignore */ }
      }
    };
  }, []);

  function loadScenario(id: string) {
    const s = scenarios.find(sc => sc.id === id);
    if (s) {
      setTranscript(s.transcript);
      setSelectedScenario(id);
      setAudioUrl(null);
      recordedBlobRef.current = null;
      setTranscribeStatus(null);
      setTranscribeSource(null);
    }
  }

  // ─── Transcribe Audio Buffer via Backend API ──────────────────────────────
  const handleTranscribeAudio = useCallback(async (blobToTranscribe?: Blob) => {
    const targetBlob = blobToTranscribe || recordedBlobRef.current;
    if (!targetBlob) return;

    setIsTranscribing(true);
    setTranscribeStatus('Transcribing audio into clinical handoff text…');
    setMicError(null);

    try {
      const mime = targetBlob.type || 'audio/webm';
      const result = await transcribeAudio(targetBlob, mime, selectedScenario || undefined);
      if (result.transcript) {
        setTranscript(result.transcript);
        setTranscribeSource(result.source === 'ai' ? 'ai' : 'mock');
        setTranscribeStatus(
          result.source === 'ai'
            ? 'Transcribed with AI voice engine'
            : 'Transcribed in Demo Mode (deterministic mock)'
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Transcription error:', msg);
      setTranscribeStatus(`Transcription error: ${msg}`);
    } finally {
      setIsTranscribing(false);
    }
  }, [selectedScenario]);

  // ─── Start Voice Recording & Speech-to-Text ───────────────────────────────
  const startRecording = useCallback(async () => {
    setMicError(null);
    setTranscribeStatus(null);
    setRecordingState('requesting');
    speechTextAccumulatedRef.current = '';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        recordedBlobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(t => t.stop());

        // If Web Speech API didn't populate any text, automatically transcribe the recorded audio
        if (!speechTextAccumulatedRef.current.trim()) {
          handleTranscribeAudio(blob);
        }
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setRecordingState('recording');
      setRecordingSeconds(0);

      // ─── Live Web Speech API Recognition ──────────────────────────────────
      const SpeechRecognitionCtor =
        (window as unknown as { SpeechRecognition?: new () => ISpeechRecognition }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => ISpeechRecognition }).webkitSpeechRecognition;

      if (SpeechRecognitionCtor) {
        try {
          const recognition = new SpeechRecognitionCtor();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';

          recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalAccumulated = '';
            let interim = '';

            for (let i = 0; i < event.results.length; i++) {
              const res = event.results[i];
              if (res.isFinal) {
                finalAccumulated += res[0].transcript + ' ';
              } else {
                interim += res[0].transcript;
              }
            }

            const currentSpoken = (finalAccumulated + interim).trim();
            if (currentSpoken) {
              speechTextAccumulatedRef.current = currentSpoken;
              setTranscript(currentSpoken);
              setTranscribeSource('live');
              setTranscribeStatus('Transcribing live voice…');
            }
          };

          recognition.onerror = () => {
            // Non-fatal: if browser speech recognition has an issue, fallback audio transcription will fire on stop
          };

          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (e) {
          console.warn('SpeechRecognition initialization error:', e);
        }
      }

      timerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMicError(
        msg.includes('denied') || msg.includes('Permission')
          ? 'Microphone permission denied. Please allow microphone access in your browser settings and try again.'
          : `Could not access microphone: ${msg}`
      );
      setRecordingState('error');
    }
  }, [handleTranscribeAudio]);

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      speechRecognitionRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    setRecordingState('stopped');
    if (speechTextAccumulatedRef.current.trim()) {
      setTranscribeStatus('Live transcription completed');
    }
  }

  function togglePlayback() {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    recordedBlobRef.current = file;
    setRecordingState('stopped');
    handleTranscribeAudio(file);
    e.target.value = '';
  }

  async function handleExtract() {
    if (!transcript.trim()) {
      setExtractError('Please enter or record a transcript before extracting.');
      return;
    }
    setIsExtracting(true);
    setExtractError(null);
    try {
      const result = await extractClinicalData(transcript.trim(), selectedScenario || undefined);
      navigate(`/intakes/${result.intake.intakeId}`);
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : 'Extraction failed. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  }

  const canRecord = recordingState === 'idle' || recordingState === 'stopped' || recordingState === 'error';
  const isRecording = recordingState === 'recording';

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">New Patient Intake</h1>
        <p className="page-subtitle">Speak or record a patient handoff transcript, then extract clinical data with Gemma 4</p>
      </div>

      {/* AI mode notice */}
      {health && (
        <div className={`alert mb-6 ${health.demoMode ? 'alert-demo' : 'alert-info'}`}>
          {health.demoMode ? (
            <><Zap size={16} /><span><strong>Demo Mode:</strong> Live voice speech-to-text works in-browser. Clinical extraction uses deterministic mock fixtures (clearly labeled).</span></>
          ) : (
            <><Sparkles size={16} /><span><strong>Live Mode:</strong> Voice audio is transcribed and extracted using <strong>{health.model}</strong>.</span></>
          )}
        </div>
      )}

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Left: Recording & Audio Options */}
        <div className="card">
          <div className="card-title mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Mic size={18} />
              Voice-to-Text Recording
            </span>
            {isRecording && (
              <span className="badge badge-critical animate-pulse" style={{ animation: 'blink 1.2s infinite' }}>
                LIVE SPEECH-TO-TEXT
              </span>
            )}
          </div>

          {/* Scenario selector & audio upload */}
          <div className="form-group">
            <label className="label" htmlFor="scenario-select">Load Demo Scenario or Preset</label>
            <div className="flex gap-2">
              <select
                id="scenario-select"
                className="select"
                style={{ flex: 1 }}
                value={selectedScenario}
                onChange={e => loadScenario(e.target.value)}
              >
                <option value="">— Choose a scenario or speak into mic —</option>
                {scenarios.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <button
                type="button"
                className="btn btn-outline btn-sm flex items-center gap-1"
                onClick={() => fileInputRef.current?.click()}
                title="Upload audio file (.mp3, .wav, .webm, .m4a)"
                id="upload-audio-file-btn"
              >
                <Upload size={14} />
                <span>Upload</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.webm,.m4a,.ogg"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>
            {selectedScenario && (
              <div className="text-xs text-muted mt-2">
                {scenarios.find(s => s.id === selectedScenario)?.description}
              </div>
            )}
          </div>

          <hr className="divider" />

          {/* Recording controls */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 16 }}>
              <button
                className={`recording-btn ${isRecording ? 'recording' : 'idle'}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={recordingState === 'requesting'}
                id={isRecording ? 'stop-recording-btn' : 'start-recording-btn'}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                {isRecording
                  ? <Square size={28} color="#fff" fill="#fff" />
                  : <Mic size={28} color="#fff" />
                }
              </button>
            </div>

            {recordingState === 'requesting' && (
              <div className="flex items-center gap-2" style={{ justifyContent: 'center' }}>
                <Loader2 size={16} className="loading-spinner" />
                <span className="text-sm text-secondary">Requesting microphone access…</span>
              </div>
            )}

            {isRecording && (
              <div className="recording-indicator" style={{ justifyContent: 'center' }}>
                <div className="recording-dot" />
                <span>Recording & Transcribing live — {formatDuration(recordingSeconds)}</span>
              </div>
            )}

            {recordingState === 'stopped' && (
              <div className="text-sm text-secondary">
                Recording captured — {formatDuration(recordingSeconds)}
              </div>
            )}

            {(canRecord && recordingState !== 'error') && (
              <div className="text-xs text-muted mt-2">
                {recordingState === 'stopped'
                  ? 'Click microphone to record a new handoff'
                  : 'Click microphone to speak — speech will transcribe in real time'
                }
              </div>
            )}
          </div>

          {/* Mic error */}
          {micError && (
            <div className="alert alert-critical mt-4">
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{micError}</span>
            </div>
          )}

          {/* Audio playback and AI re-transcribe */}
          {audioUrl && (
            <div className="mt-4" style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted font-semibold">AUDIO PLAYBACK</span>
                <button
                  type="button"
                  className="btn btn-outline btn-xs flex items-center gap-1"
                  onClick={() => handleTranscribeAudio()}
                  disabled={isTranscribing}
                  id="retranscribe-audio-btn"
                  title="Run audio through AI transcription engine"
                >
                  {isTranscribing ? (
                    <><Loader2 size={12} className="loading-spinner" /> Transcribing…</>
                  ) : (
                    <><RefreshCw size={12} /> AI Transcribe</>
                  )}
                </button>
              </div>
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                style={{ width: '100%' }}
                controls
                aria-label="Recorded audio playback"
              />
            </div>
          )}

          {/* Transcription status indicator */}
          {transcribeStatus && (
            <div className={`alert ${isTranscribing ? 'alert-info' : 'alert-success'} mt-4`} style={{ fontSize: '0.8125rem' }}>
              {isTranscribing ? (
                <Loader2 size={15} className="loading-spinner" />
              ) : (
                <CheckCircle2 size={15} />
              )}
              <span>{transcribeStatus}</span>
            </div>
          )}

          <div className="alert alert-info mt-4" style={{ fontSize: '0.75rem' }}>
            <Volume2 size={14} style={{ flexShrink: 0 }} />
            <span>
              <strong>Voice-to-Text Active:</strong> Speak naturally into your microphone or upload an audio file. Speech is transcribed directly into editable clinical text, ready for structured extraction by <strong>{health?.model || 'gemma-4-26b-a4b-it'}</strong>.
            </span>
          </div>
        </div>

        {/* Right: Transcript */}
        <div className="card">
          <div className="card-title mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText size={18} />
              Patient Handoff Transcript
            </span>
            {transcribeSource && (
              <span className={`badge ${transcribeSource === 'ai' ? 'badge-primary' : transcribeSource === 'live' ? 'badge-success' : 'badge-warning'}`}>
                {transcribeSource === 'live' ? 'Live Transcribed' : transcribeSource === 'ai' ? 'AI Transcribed' : 'Demo Transcript'}
              </span>
            )}
          </div>
          <div className="form-group">
            <label className="label" htmlFor="transcript-input">
              Transcript (editable before extraction)
            </label>
            <textarea
              id="transcript-input"
              className="textarea"
              style={{ minHeight: 280, fontFamily: 'inherit', lineHeight: 1.7 }}
              placeholder="Speak using the microphone on the left, upload an audio file, choose a demo scenario, or type manually..."
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              aria-label="Patient handoff transcript"
            />
            <div className="text-xs text-muted mt-1 flex justify-between">
              <span>{transcript.length} characters</span>
              {transcript.length > 10000 && (
                <span style={{ color: 'var(--color-critical)' }}>
                  ⚠ Maximum 10,000 characters
                </span>
              )}
            </div>
          </div>

          {extractError && (
            <div className="alert alert-critical mb-4">
              <AlertTriangle size={16} />
              {extractError}
            </div>
          )}

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            onClick={handleExtract}
            disabled={isExtracting || !transcript.trim() || transcript.length > 10000}
            id="extract-clinical-data-btn"
            aria-label="Extract clinical data from transcript"
          >
            {isExtracting ? (
              <><Loader2 size={18} className="loading-spinner" />Extracting with Gemma 4…</>
            ) : (
              <><Sparkles size={18} />Extract Clinical Data</>
            )}
          </button>

          <div className="text-xs text-muted mt-3" style={{ textAlign: 'center' }}>
            {health?.demoMode
              ? '🔬 Will use deterministic mock extraction (no API call)'
              : `🤖 Will call Gemma 4 (${health?.model || 'gemma-4-26b-a4b-it'}) for clinical extraction`
            }
          </div>
        </div>
      </div>
    </div>
  );
}
