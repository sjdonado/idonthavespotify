import * as ENV from '~/config/env/server';

interface CaptchaResponse {
  success: boolean;
  challenge_ts: string;
  hostname: string;
}

export const verityCaptcha = async (token: string): Promise<boolean> => {
  const recaptchaURL = 'https://www.google.com/recaptcha/api/siteverify';

  const captchaResponse: CaptchaResponse = await fetch(recaptchaURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      secret: ENV.recapcha.secretKey,
      response: token,
    }),
  }).then((res) => res.json());

  return captchaResponse.success;
};
