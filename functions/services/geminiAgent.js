
function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured on the server');
    error.status = 503;
    throw error;
  }
  return { apiKey };
}

export async function askGemini(prompt, systemInstruction = '', options = {}) {
  const trimmedPrompt = typeof prompt === 'string' ? prompt.trim() : '';
  if (!trimmedPrompt) {
    const error = new Error('Prompt is required');
    error.status = 400;
    throw error;
  }

  const { apiKey } = getGeminiConfig();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [{ text: trimmedPrompt }],
      },
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxOutputTokens ?? 1000,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || 'Gemini request failed');
    error.status = response.status;
    error.details = payload;
    throw error;
  }

  const candidate = payload.candidates?.[0];
  const answer = candidate?.content?.parts?.[0]?.text || '';
  
  return {
    answer: answer.trim(),
    model: 'gemini-1.5-flash',
  };
}
