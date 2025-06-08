import Nano from 'nano-jsx';

interface RateLimitErrorProps {
  message?: string;
  retryAfter?: number; // seconds until they can try again
  resetTime?: string; // ISO string of when limit resets
}

export default function RateLimitError({
  message = 'Too many requests. Please slow down and try again later.',
  retryAfter,
  resetTime,
}: RateLimitErrorProps) {
  const formatRetryTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  const formatResetTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString();
    } catch {
      return 'shortly';
    }
  };

  return (
    <div class="flex flex-col items-center justify-center min-h-[400px] p-4 text-center">
      <div class="max-w-md mx-auto flex flex-col gap-4">
        <h2 class="text-2xl mb-4">Rate Limit Exceeded</h2>

        <p class="leading-relaxed">{message}</p>

        {(retryAfter || resetTime) && (
          <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p class="text-sm text-orange-800">
              {retryAfter && retryAfter > 0 ? (
                <>
                  You can try again in <strong>{formatRetryTime(retryAfter)}</strong>
                </>
              ) : resetTime ? (
                <>
                  You can try again at <strong>{formatResetTime(resetTime)}</strong>
                </>
              ) : (
                'Please wait a moment before trying again'
              )}
            </p>
          </div>
        )}

        <div class="text-left bg-zinc-700 text-zinc-300 rounded-lg p-4">
          <h3 class="font-semibold mb-2">Tips:</h3>
          <ul class="text-sm space-y-1 list-disc list-outside">
            <li>Wait for the cooldown period to reset</li>
            <li>Avoid making too many requests quickly</li>
            <li>Refresh the page after the wait time</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

