export function formatFilename(filename: string | null | undefined): string | null {
  if (!filename) return null;
  
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  // If the filename contains a path, extract parent directory + filename
  if (filename.includes('/') || filename.includes('\\')) {
    const parts = filename.split(/[/\\]/);
    if (parts.length >= 2) {
      // Return last two parts (parent directory + filename)
      return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
    }
  }
  
  return filename;
}

export function getFileDirectory(filename: string | null | undefined): string | null {
  if (!filename) return null;
  
  // If the filename contains a path, extract parent directory
  if (filename.includes('/') || filename.includes('\\')) {
    const parts = filename.split(/[/\\]/);
    if (parts.length >= 2) {
      // Return parent directory
      return parts[parts.length - 2];
    }
  }
  
  return null;
}

export function getFileBasename(filename: string | null | undefined): string | null {
  if (!filename) return null;
  
  // Extract just the filename without path
  const parts = filename.split(/[/\\]/);
  return parts[parts.length - 1];
}