const NVIDIA_COMPLETIONS_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

function getNvidiaConfig() {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    const error = new Error('NVIDIA_API_KEY is not configured');
    error.status = 503;
    throw error;
  }
  return { apiKey };
}

async function askGlmAgent(input, options = {}) {
  const trimmedInput = typeof input === 'string' ? input.trim() : '';
  if (!trimmedInput) {
    const error = new Error('Prompt is required');
    error.status = 400;
    throw error;
  }

  const config = getNvidiaConfig();
  const body = {
    model: 'z-ai/glm-5.2',
    messages: [
      {
        role: 'user',
        content: trimmedInput,
      },
    ],
    temperature: options.temperature ?? 1,
    top_p: options.top_p ?? 1,
    max_tokens: options.max_tokens ?? 1024,
    seed: options.seed ?? 42,
    stream: false,
  };

  const response = await fetch(NVIDIA_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || 'NVIDIA request failed');
    error.status = response.status;
    error.details = payload;
    throw error;
  }

  const answer = payload.choices?.[0]?.message?.content || '';

  return {
    answer,
    model: payload.model || 'z-ai/glm-5.2',
    responseId: payload.id,
    usage: payload.usage,
  };
}

module.exports = { askGlmAgent };
