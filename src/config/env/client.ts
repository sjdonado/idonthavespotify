interface ClientEnv {
  readonly VITE_RECAPTCHA_SITE_KEY: string;
}

const { VITE_RECAPTCHA_SITE_KEY } = import.meta.env as ImportMetaEnv & ClientEnv;

export const recaptcha = {
  siteKey: VITE_RECAPTCHA_SITE_KEY,
};
