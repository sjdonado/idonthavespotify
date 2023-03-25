const { VITE_RECAPTCHA_SECRET_KEY } = import.meta.env;

interface CaptchaResponse {
  success: boolean;
  challenge_ts: string;
  hostname: string;
}

export const verityCaptcha = async (token: string): Promise<boolean> => {
  const captchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      secret: VITE_RECAPTCHA_SECRET_KEY,
      response: token,
    }),
  }).then((res) => res.json()) as CaptchaResponse;

  return captchaResponse.success;
};
