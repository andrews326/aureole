// src/utils/voiceRecorder.ts

export function createVoiceRecorder() {
    let mediaRecorder: MediaRecorder | null = null;
    let chunks: Blob[] = [];
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let dataArray: Uint8Array | null = null;
  
    async function start(onWave?: (v: number) => void) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
  
      // Best-possible MIME detection
      const mime =
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
          ? "audio/ogg;codecs=opus"
          : "";
  
      mediaRecorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
  
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.start();
  
      // Waveform callback
      if (onWave) {
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
  
        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
  
        const tick = () => {
          if (!analyser || !dataArray) return;
  
          analyser.getByteTimeDomainData(dataArray);
          let peak = 0;
          for (let v of dataArray) peak = Math.max(peak, Math.abs(v - 128));
  
          onWave(peak / 128);
          requestAnimationFrame(tick);
        };
  
        tick();
      }
  
      return stream;
    }
  
    async function stop() {
      return new Promise<Blob>((resolve) => {
        if (!mediaRecorder) return resolve(new Blob());
  
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: mediaRecorder!.mimeType });
          resolve(blob);
        };
  
        mediaRecorder.stop();
  
        // Cleanup
        audioContext?.close();
        audioContext = null;
        analyser = null;
        source = null;
        dataArray = null;
      });
    }
  
    return { start, stop };
  }  