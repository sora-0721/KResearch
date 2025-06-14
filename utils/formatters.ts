
export const formatDuration = (ms: number | null): string => {
  if (ms === null || ms < 0) return 'N/A';

  let seconds = Math.floor(ms / 1000);
  let minutes = Math.floor(seconds / 60);
  let hours = Math.floor(minutes / 60);
  let days = Math.floor(hours / 24);

  seconds %= 60;
  minutes %= 60;
  hours %= 24;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  if (parts.length === 0 || (seconds > 0 && parts.length < 2 && days === 0 && hours === 0)) {
     if (seconds > 0 || (days === 0 && hours === 0 && minutes === 0) ) {
        parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
     }
  }
  
  if (parts.length === 0) return ms > 0 ? "Less than a second" : "0 seconds";
  return parts.join(' ');
};
