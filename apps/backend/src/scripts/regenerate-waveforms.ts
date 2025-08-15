import { prisma } from '../utils/database';
import { Prisma } from '@prisma/client';
import { generateWaveform, simplifyWaveform } from '../utils/waveform';
import { downloadFromGCS } from '../lib/storage';
import * as fs from 'fs';
import * as path from 'path';

async function regenerateWaveforms() {
  console.log('Starting waveform regeneration...');
  
  try {
    // Find all tracks without waveform data
    const tracks = await prisma.track.findMany({
      where: {
        OR: [
          { waveformData: { equals: Prisma.DbNull } },
          { waveformData: { equals: Prisma.JsonNull } }
        ]
      },
      select: {
        id: true,
        title: true,
        fileUrl: true
      }
    });
    
    console.log(`Found ${tracks.length} tracks without waveform data`);
    
    for (const track of tracks) {
      console.log(`Processing track: ${track.title} (${track.id})`);
      
      try {
        // Skip if no file URL
        if (!track.fileUrl) {
          console.log(`  Skipping - no file URL`);
          continue;
        }
        
        // Download file temporarily
        const tempDir = '/tmp';
        const tempPath = path.join(tempDir, `${track.id}.mp3`);
        
        // Download from GCS
        const buffer = await downloadFromGCS(track.fileUrl);
        fs.writeFileSync(tempPath, buffer);
        
        // Generate waveform
        const waveform = await generateWaveform(tempPath, 10);
        
        // Update track with waveform data
        await prisma.track.update({
          where: { id: track.id },
          data: {
            waveformData: {
              full: waveform.peaks,
              simplified: simplifyWaveform(waveform.peaks, 100),
              sampleRate: waveform.sampleRate
            },
            duration: waveform.duration
          }
        });
        
        // Clean up temp file
        fs.unlinkSync(tempPath);
        
        console.log(`  ✓ Generated waveform successfully`);
      } catch (error) {
        console.error(`  ✗ Error processing track ${track.id}:`, error);
      }
    }
    
    console.log('Waveform regeneration complete!');
  } catch (error) {
    console.error('Error during waveform regeneration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  regenerateWaveforms();
}

export { regenerateWaveforms };