const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || '';
const RECAPTCHA_MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE || 0.5);
const RECAPTCHA_ENFORCE = process.env.RECAPTCHA_ENFORCE === 'true';

async function verifyRecaptchaToken(token, remoteIp) {
  const form = new URLSearchParams();
  form.set('secret', RECAPTCHA_SECRET_KEY);
  form.set('response', token);
  if (remoteIp) {
    form.set('remoteip', remoteIp);
  }

  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`reCAPTCHA verify request failed (${response.status})`);
  }

  return response.json();
}

export function requireRecaptcha(actionName) {
  return async (req, res, next) => {
    if (!RECAPTCHA_SECRET_KEY) {
      if (RECAPTCHA_ENFORCE) {
        return res.status(503).json({ error: 'Security verification is temporarily unavailable. Please try again.' });
      }
      return next();
    }

    const token = String(req.body?.recaptchaToken || req.headers['x-recaptcha-token'] || '').trim();
    if (!token) {
      return res.status(400).json({ error: 'Security verification is required.' });
    }

    try {
      const verifyPayload = await verifyRecaptchaToken(token, req.ip);
      if (!verifyPayload.success) {
        return res.status(403).json({ error: 'Security verification failed. Please try again.' });
      }

      if (typeof verifyPayload.score === 'number' && verifyPayload.score < RECAPTCHA_MIN_SCORE) {
        return res.status(403).json({ error: 'Security verification failed. Please try again.' });
      }

      if (actionName && verifyPayload.action && verifyPayload.action !== actionName) {
        return res.status(403).json({ error: 'Security verification failed. Please refresh and try again.' });
      }

      req.recaptcha = {
        success: true,
        score: verifyPayload.score,
        action: verifyPayload.action,
        challenge_ts: verifyPayload.challenge_ts,
        hostname: verifyPayload.hostname,
      };

      return next();
    } catch (error) {
      return res.status(502).json({ error: 'Security verification service is unavailable. Please try again.' });
    }
  };
}
