const PERPLEXITY_AGENT_URL = 'https://api.perplexity.ai/v1/agent';

function getPerplexityConfig() {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    const error = new Error('PERPLEXITY_API_KEY is not configured');
    error.status = 503;
    throw error;
  }

  return {
    apiKey,
    model: process.env.PERPLEXITY_AGENT_MODEL,
    preset: process.env.PERPLEXITY_AGENT_PRESET || 'pro-search',
  };
}

function extractOutputText(response) {
  if (response.output_text) return response.output_text;

  const chunks = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join('\n').trim();
}

async function askPerplexityAgent(input, options = {}) {
  const trimmedInput = typeof input === 'string' ? input.trim() : '';
  if (!trimmedInput) {
    const error = new Error('Prompt is required');
    error.status = 400;
    throw error;
  }

  const config = getPerplexityConfig();
  const body = {
    input: trimmedInput,
    temperature: options.temperature ?? 0.2,
  };

  if (config.model) {
    body.model = config.model;
  } else {
    body.preset = config.preset;
  }

  const response = await fetch(PERPLEXITY_AGENT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error?.message || 'Perplexity request failed');
    error.status = response.status;
    error.details = payload;
    throw error;
  }

  return {
    answer: extractOutputText(payload),
    model: payload.model,
    responseId: payload.id,
    usage: payload.usage,
  };
}

module.exports = { askPerplexityAgent };
