import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Download, CheckCircle, Volume2 } from 'lucide-react';

interface AudioRecorderProps {
  onRecordingComplete: (audioBlobUrl: string, durationSeconds: number) => void;
  existingAudioUrl?: string;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onRecordingComplete,
  existingAudioUrl
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudioUrl || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startRecording = async () => {
    setPermissionError(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      // Audio visualizer setup
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      drawWaveform();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        onRecordingComplete(url, recordingTime);

        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop());
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setPermissionError('Geef toestemming voor de microfoon om je stem op te nemen.');
    }
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyserRef.current!.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    };
    render();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const togglePlayback = () => {
    if (!audioElementRef.current || !audioUrl) return;

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play();
      setIsPlaying(true);
    }
  };

  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="bg-amber-50/70 border-2 border-amber-200 rounded-3xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
        <div>
          <h4 className="text-base font-bold text-stone-900 font-lexend flex items-center gap-2">
            <Mic className="w-5 h-5 text-amber-600" />
            Neem je eigen stem op
          </h4>
          <p className="text-xs text-stone-600">
            Lees de tekst hardop voor en luister jezelf terug of bezorg het aan de leerkracht.
          </p>
        </div>

        {/* Timer display */}
        <div className="bg-white px-3 py-1.5 rounded-full border border-amber-200 shadow-xs text-xs font-mono font-bold text-amber-800 flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-stone-300'}`} />
          {formatTime(recordingTime)}
        </div>
      </div>

      {permissionError && (
        <div className="p-3 mb-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
          {permissionError}
        </div>
      )}

      {/* Waveform / Visualizer */}
      {isRecording && (
        <div className="mb-4 bg-amber-100/60 rounded-xl p-2 flex items-center justify-center">
          <canvas ref={canvasRef} width={260} height={36} className="w-full max-w-xs h-9" />
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {!isRecording && !audioUrl && (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl shadow-sm transition-all active:scale-95 cursor-pointer text-sm font-lexend"
          >
            <Mic className="w-4 h-4" />
            Start opname
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-2xl shadow-sm transition-all active:scale-95 cursor-pointer text-sm font-lexend animate-pulse"
          >
            <Square className="w-4 h-4 fill-current" />
            Stop opname ({formatTime(recordingTime)})
          </button>
        )}

        {audioUrl && !isRecording && (
          <>
            <button
              onClick={togglePlayback}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-sm transition-all active:scale-95 cursor-pointer text-sm font-lexend"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              {isPlaying ? 'Pauzeren' : 'Beluister opname'}
            </button>

            <button
              onClick={resetRecording}
              className="flex items-center gap-1.5 px-3 py-2 text-stone-600 hover:text-stone-900 hover:bg-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Opnieuw opnemen
            </button>

            <a
              href={audioUrl}
              download="mijn-leesopname.webm"
              className="flex items-center gap-1.5 px-3 py-2 text-amber-800 hover:bg-white rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-amber-200"
            >
              <Download className="w-3.5 h-3.5" />
              Opslaan
            </a>

            <div className="ml-auto hidden md:flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-100/80 px-2.5 py-1 rounded-full">
              <CheckCircle className="w-3.5 h-3.5" />
              Opname opgeslagen voor rapport
            </div>

            <audio
              ref={audioElementRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </>
        )}
      </div>
    </div>
  );
};
