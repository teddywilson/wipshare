import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';
import * as fs from 'fs/promises';
import * as path from 'path';

interface WaveformData {
  peaks: number[];
  duration: number;
  sampleRate: number;
}

/**
 * Generate waveform data from an audio file
 * Returns normalized peak values (0-1 range) and duration
 */
export async function generateWaveform(
  audioPath: string,
  samplesPerSecond: number = 20  // Increased for better resolution
): Promise<WaveformData> {
  return new Promise((resolve, reject) => {
    const peaks: number[] = [];
    let duration = 0;
    let sampleRate = 0;

    // First, get audio metadata
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) {
        return reject(err);
      }

      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      if (!audioStream) {
        return reject(new Error('No audio stream found'));
      }

      duration = metadata.format.duration || 0;
      sampleRate = typeof audioStream.sample_rate === 'string' 
        ? parseInt(audioStream.sample_rate) 
        : audioStream.sample_rate || 44100;
      
      // Calculate number of samples we want
      const totalSamples = Math.ceil(duration * samplesPerSecond);
      const sampleInterval = duration / totalSamples;

      // Extract raw PCM data and calculate peaks
      const tempFile = path.join('/tmp', `waveform-${Date.now()}.raw`);
      
      ffmpeg(audioPath)
        .outputOptions([
          '-f', 's16le',        // 16-bit signed little-endian
          '-ac', '1',           // Convert to mono
          '-ar', '8000',        // Lower sample rate for processing
          '-acodec', 'pcm_s16le'
        ])
        .on('error', (err) => {
          // Clean up temp file
          fs.unlink(tempFile).catch(() => {});
          reject(err);
        })
        .on('end', async () => {
          try {
            // Read the raw PCM data
            const buffer = await fs.readFile(tempFile);
            
            // Process PCM data to extract peaks
            const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
            const samplesPerPeak = Math.floor(samples.length / totalSamples);
            
            for (let i = 0; i < totalSamples; i++) {
              const start = i * samplesPerPeak;
              const end = Math.min(start + samplesPerPeak, samples.length);
              
              // Find peak in this segment
              let maxPeak = 0;
              for (let j = start; j < end; j++) {
                const amplitude = Math.abs(samples[j] / 32768); // Normalize to 0-1
                if (amplitude > maxPeak) {
                  maxPeak = amplitude;
                }
              }
              
              peaks.push(maxPeak);
            }
            
            // Clean up temp file
            await fs.unlink(tempFile);
            
            // Normalize peaks to ensure good visual representation
            const maxPeak = Math.max(...peaks);
            const normalizedPeaks = peaks.map(p => {
              // Ensure minimum visibility for quiet sections
              const normalized = maxPeak > 0 ? p / maxPeak : 0;
              return Math.max(normalized, 0.02); // Minimum 2% height
            });
            
            resolve({
              peaks: normalizedPeaks,
              duration: Math.round(duration),
              sampleRate: samplesPerSecond
            });
          } catch (error) {
            // Clean up temp file on error
            fs.unlink(tempFile).catch(() => {});
            reject(error);
          }
        })
        .save(tempFile);
    });
  });
}

/**
 * Generate a simplified waveform for small displays (e.g., dashboard cards)
 * Uses a combination of max and RMS (root mean square) for better visual accuracy
 */
export function simplifyWaveform(peaks: number[], targetLength: number = 50): number[] {
  if (peaks.length <= targetLength) {
    return peaks;
  }
  
  const simplified: number[] = [];
  const chunkSize = peaks.length / targetLength;
  
  for (let i = 0; i < targetLength; i++) {
    const start = Math.floor(i * chunkSize);
    const end = Math.floor((i + 1) * chunkSize);
    
    // Calculate both max and RMS for better visual representation
    let maxPeak = 0;
    let sumSquares = 0;
    let count = 0;
    
    for (let j = start; j < end && j < peaks.length; j++) {
      const peak = peaks[j];
      if (peak > maxPeak) {
        maxPeak = peak;
      }
      sumSquares += peak * peak;
      count++;
    }
    
    // Calculate RMS (Root Mean Square) for better energy representation
    const rmsPeak = count > 0 ? Math.sqrt(sumSquares / count) : 0;
    
    // Use weighted combination favoring max to preserve dynamics
    // but including RMS to show overall energy
    const combinedPeak = maxPeak * 0.8 + rmsPeak * 0.2;
    
    // Apply slight smoothing with neighbors for visual continuity
    if (i > 0 && i < targetLength - 1) {
      const prevStart = Math.floor((i - 1) * chunkSize);
      const nextEnd = Math.floor((i + 2) * chunkSize);
      let neighborMax = 0;
      
      for (let j = prevStart; j < nextEnd && j < peaks.length; j++) {
        neighborMax = Math.max(neighborMax, peaks[j]);
      }
      
      // Slight influence from neighbors for smoothness
      const smoothedPeak = combinedPeak * 0.9 + neighborMax * 0.1;
      simplified.push(Math.min(1, Math.max(0.02, smoothedPeak)));
    } else {
      simplified.push(Math.min(1, Math.max(0.02, combinedPeak)));
    }
  }
  
  return simplified;
}