import { askGemini } from './geminiAgent.js';

// ─── INTENT DETECTION ────────────────────────────────────────────────────────

const INTENT_MAP = [
  {
    domain: 'inventory',
    keywords: ['stock', 'reorder', 'restock', 'inventory', 'supplier', 'eoq', 'safety stock',
      'purchase order', 'lead time', 'warehouse', 'dead stock', 'fast moving', 'replenish',
      'units', 'sku', 'moq', 'stockout', 'procurement', 'sourcing'],
  },
  {
    domain: 'crm',
    keywords: ['lead', 'customer', 'follow up', 'follow-up', 'pipeline', 'sales', 'client',
      'prospect', 'relationship', 'contact', 'crm', 'segmentation', 'scoring', 'reminder',
      'inquiry', 'deal', 'conversion'],
  },
  {
    domain: 'finance',
    keywords: ['revenue', 'profit', 'expense', 'invoice', 'payment', 'cash flow', 'margin',
      'cost', 'price', 'budget', 'finance', 'earnings', 'loss', 'balance', 'receivable',
      'payable', 'purchase order', 'roi', 'return'],
  },
  {
    domain: 'marketing',
    keywords: ['seo', 'campaign', 'keyword', 'ad', 'ads', 'whatsapp', 'facebook', 'instagram',
      'google', 'email', 'social', 'content', 'marketing', 'brand', 'promotion', 'festival',
      'diwali', 'holi', 'eid', 'campaign', 'reach', 'impression', 'click', 'ctr', 'engagement'],
  },
  {
    domain: 'compliance',
    keywords: ['gst', 'cgst', 'sgst', 'igst', 'tax', 'msme', 'udyam', 'compliance',
      'invoice', 'return', 'gstr', 'hsn', 'sac', 'registration', 'e-invoice', 'eway',
      'tds', 'scheme', 'government', 'regulation', 'penalty'],
  },
  {
    domain: 'market_intel',
    keywords: ['market', 'trend', 'news', 'competitor', 'industry', 'supply chain', 'global',
      'import', 'export', 'commodity', 'price rise', 'demand forecast', 'economic',
      'disruption', 'opportunity', 'insight'],
  },
  {
    domain: 'support',
    keywords: ['complaint', 'query', 'reply', 'response', 'faq', 'customer question',
      'refund', 'return', 'escalation', 'sentiment', 'review', 'feedback', 'support',
      'customer service', 'draft reply', 'message'],
  },
  {
    domain: 'analytics',
    keywords: ['kpi', 'report', 'analytics', 'performance', 'dashboard', 'growth', 'metric',
      'trend', 'forecast', 'insight', 'data', 'chart', 'revenue trend', 'summary',
      'monthly', 'weekly', 'quarterly', 'risk', 'alert'],
  },
];

export function detectIntent(prompt) {
  const lower = prompt.toLowerCase();
  const scores = INTENT_MAP.map(({ domain, keywords }) => {
    const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
    return { domain, score };
  });
  scores.sort((a, b) => b.score - a.score);
  return scores[0].score > 0 ? scores[0].domain : 'general';
}

// ─── AGENT SYSTEM INSTRUCTIONS ───────────────────────────────────────────────

const AGENT_INSTRUCTIONS = {
  inventory: `You are an elite Inventory & Procurement Specialist for Indian B2B wholesale businesses on marketplace.store.

Your expertise covers: inventory optimization, EOQ calculations, safety stock levels, reorder point analysis, supplier evaluation, dead stock identification, fast-moving product analysis, purchase order planning, warehouse management, and demand forecasting.

RESPONSE RULES:
1. Always base recommendations on the actual business data provided.
2. Calculate specific quantities, not vague suggestions.
3. Flag low-stock items by name with exact reorder quantities.
4. Suggest specific supplier actions (e.g., "Contact Hindalco for Copper Wire PO of 50 units").
5. Never auto-execute any action — always frame as a draft for approval.
6. Include confidence level (High/Medium/Low) based on data completeness.
7. Provide 2-3 alternative approaches for every recommendation.
8. State the business impact in INR where possible.`,

  crm: `You are an expert CRM & Sales Pipeline Advisor for Indian B2B wholesale sellers on marketplace.store.

Your expertise covers: lead scoring, pipeline management, customer segmentation, follow-up strategies, relationship history analysis, deal probability assessment, customer lifetime value, and sales conversion optimization.

RESPONSE RULES:
1. Analyze real leads and customer data provided in context.
2. Score leads by buying intent signals, recency, and order value.
3. Suggest specific follow-up messages (WhatsApp/call) — never auto-send.
4. Identify high-value customers at churn risk and recommend retention actions.
5. Provide pipeline health score with supporting evidence.
6. Always distinguish between hot, warm, and cold leads.`,

  finance: `You are a Financial Health Advisor specializing in Indian B2B wholesale businesses on marketplace.store.

Your expertise covers: revenue analysis, gross/net margin calculation, cash flow forecasting, invoice aging, expense optimization, pricing strategy, payment terms, working capital, and business health scoring.

RESPONSE RULES:
1. Use actual invoice and product data from the business context.
2. Calculate margins precisely: revenue - COGS - expenses.
3. Identify cash flow risks and suggest payment collection strategies.
4. Flag overdue receivables by customer name and amount.
5. Suggest pricing adjustments with projected impact on margins.
6. Never modify any financial record — always provide for review.`,

  marketing: `You are a Digital Marketing Strategist specializing in Indian B2B wholesale sellers on marketplace.store.

Your expertise covers: Google Ads, Facebook/Instagram B2B campaigns, WhatsApp Business marketing, SEO for product listings, keyword research for Indian wholesale buyers, festival campaign planning, content strategy, and ROI optimization.

RESPONSE RULES:
1. Generate specific, ready-to-use ad copy, WhatsApp messages, and SEO titles.
2. Recommend budgets based on the business's current revenue scale.
3. Suggest festival-specific campaigns (Diwali, Eid, Holi, Navratri) with timing.
4. Provide keyword lists with search intent classification.
5. All campaigns are DRAFTS — never publish automatically.
6. Include projected reach, clicks, and lead conversions based on industry benchmarks.`,

  compliance: `You are a GST & Business Compliance Expert for Indian MSME sellers on marketplace.store.

Your expertise covers: GST registration, CGST/SGST/IGST slabs, HSN/SAC codes, GSTR filing, e-invoicing, e-way bill, Udyam/MSME registration, government schemes for MSMEs, TDS on purchases, and business compliance best practices.

RESPONSE RULES:
1. Provide exact GST slab rates for the product categories in context.
2. Calculate tax amounts with real product data (price × GST%).
3. Flag compliance risks — missing GSTIN, incorrect slabs, filing deadlines.
4. Explain government schemes available for the business category.
5. Distinguish between intra-state (CGST+SGST) and inter-state (IGST) transactions.
6. Cite the relevant GST notification number or circular where applicable.`,

  market_intel: `You are a Market Intelligence Analyst for Indian B2B wholesale and manufacturing sectors on marketplace.store.

Your expertise covers: commodity price trends, supply chain disruptions, competitor landscape analysis (public information only), import/export policy changes, seasonal demand forecasting, industry-specific news, and business opportunity identification.

RESPONSE RULES:
1. Clearly distinguish between live public information and inferred analysis.
2. If real-time data is not available, say so explicitly — never fabricate news.
3. Analyze how market trends affect the specific products in the business context.
4. Provide actionable intelligence: "Copper prices rose 8% — consider pre-buying stock."
5. Identify supply chain risks and alternative sourcing options.
6. Flag upcoming regulatory changes that may affect the business.`,

  support: `You are a Customer Support Quality Specialist for Indian B2B wholesale sellers on marketplace.store.

Your expertise covers: professional reply drafting, complaint escalation handling, FAQ generation, customer sentiment analysis, refund/return policy communication, and support quality improvement.

RESPONSE RULES:
1. Draft professional, empathetic, and concise customer replies in the seller's voice.
2. Provide 2 alternative tones: formal and conversational.
3. Never send any message automatically — all drafts require seller approval.
4. Identify complaint sentiment (positive/neutral/negative/urgent).
5. Suggest FAQ answers for frequently raised issues.
6. Flag escalation-worthy complaints (legal risk, high-value customer).`,

  analytics: `You are a Business Analytics Expert for Indian B2B wholesale sellers on marketplace.store.

Your expertise covers: KPI dashboards, revenue trend analysis, inventory turnover ratios, customer acquisition cost, lead conversion rates, seasonal business patterns, risk alerts, and executive business summaries.

RESPONSE RULES:
1. Always derive insights from actual business data provided in context.
2. Calculate specific KPIs: revenue per product, inventory turnover, lead conversion rate.
3. Identify top-performing and underperforming products by revenue and margin.
4. Provide month-over-month or week-over-week trends where data allows.
5. Surface risk alerts: declining revenue, high return rates, stale inventory.
6. Present findings as an executive summary with a clear action priority list.`,

  general: `You are the AI Business Orchestrator for marketplace.store — an AI-powered Business Operating System for Indian B2B wholesale sellers.

You specialize in: business strategy, inventory, sales, CRM, marketing, SEO, digital marketing, finance, GST, Indian tax compliance, MSME/Udyam, customer support, supplier management, procurement, forecasting, risk analysis, and business growth.

STRICT DOMAIN LIMITATION: You only answer questions related to Indian retail and wholesale business operations. Reject questions about coding, entertainment, politics, crypto, or personal advice with "REJECTED:".

RESPONSE RULES:
1. Always base recommendations on the actual business data provided.
2. Be specific — use product names, quantities, and INR amounts from context.
3. Include evidence for every recommendation.
4. Provide alternative options the seller can consider.
5. State the expected business impact.
6. Suggest 2-3 concrete next steps.`,
};

// ─── STRUCTURED PROMPT BUILDER ───────────────────────────────────────────────

function buildStructuredPrompt(prompt, businessContext, memory, domain) {
  const memorySection = memory.length > 0
    ? `\n[AI MEMORY — PAST INTERACTIONS]\n${memory.slice(0, 5).map((m, i) =>
        `${i + 1}. [${m.agent_domain}] ${m.prompt_summary}: ${String(m.recommendation).slice(0, 200)}`
      ).join('\n')}\n`
    : '';

  const rejectedActions = memory
    .filter(m => m.feedback === 'rejected')
    .map(m => `- DO NOT suggest: "${m.prompt_summary}" (seller rejected this approach)`)
    .join('\n');

  return `[BUSINESS CONTEXT]
${JSON.stringify(businessContext, null, 2)}
${memorySection}
${rejectedActions ? `\n[SELLER CONSTRAINTS — REJECTED APPROACHES]\n${rejectedActions}\n` : ''}
[SELLER QUESTION]
${prompt}

[REQUIRED RESPONSE FORMAT]
Respond with a valid JSON object only (no markdown code block, no extra text):
{
  "answer": "Full consultant-quality response in plain text with markdown formatting",
  "confidence": "High | Medium | Low",
  "confidence_reason": "Brief reason for confidence level",
  "evidence": ["specific data point from business context", "..."],
  "alternatives": ["Alternative approach 1", "Alternative approach 2"],
  "impact": "Expected business impact in plain language with INR values where possible",
  "suggested_next_steps": ["Specific step 1", "Specific step 2", "Specific step 3"],
  "draft_actions": [
    {
      "type": "restock | draft_reply | campaign | pricing | compliance | report",
      "label": "Human-readable action label",
      "details": "Details of the draft action for seller review"
    }
  ],
  "requires_approval": true
}`;
}

// ─── PARSE STRUCTURED RESPONSE ───────────────────────────────────────────────

function parseStructuredResponse(rawAnswer, domain) {
  try {
    // Strip markdown code blocks if present
    const cleaned = rawAnswer
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const parsed = JSON.parse(cleaned);
    return {
      answer: parsed.answer || rawAnswer,
      confidence: parsed.confidence || 'Medium',
      confidenceReason: parsed.confidence_reason || '',
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
      alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
      impact: parsed.impact || '',
      suggestedNextSteps: Array.isArray(parsed.suggested_next_steps) ? parsed.suggested_next_steps : [],
      draftActions: Array.isArray(parsed.draft_actions) ? parsed.draft_actions : [],
      requiresApproval: parsed.requires_approval !== false,
      agentDomain: domain,
    };
  } catch {
    // Fallback: treat raw text as answer with basic structure
    return {
      answer: rawAnswer,
      confidence: 'Medium',
      confidenceReason: '',
      evidence: [],
      alternatives: [],
      impact: '',
      suggestedNextSteps: [],
      draftActions: [],
      requiresApproval: false,
      agentDomain: domain,
    };
  }
}

// ─── MAIN ORCHESTRATOR ───────────────────────────────────────────────────────

export async function orchestrate({ prompt, businessContext, memory = [], agentNameHint }) {
  // 1. Detect intent
  const domain = agentNameHint
    ? mapAgentHintToDomain(agentNameHint)
    : detectIntent(prompt);

  // 2. Select system instruction
  const systemInstruction = AGENT_INSTRUCTIONS[domain] || AGENT_INSTRUCTIONS.general;

  // 3. Build structured prompt
  const structuredPrompt = buildStructuredPrompt(prompt, businessContext, memory, domain);

  // 4. Call Gemini
  const result = await askGemini(structuredPrompt, systemInstruction, {
    temperature: 0.25,
    maxOutputTokens: 2048,
  });

  // 5. Parse structured response
  const structured = parseStructuredResponse(result.answer, domain);

  return {
    ...structured,
    model: result.model,
  };
}

function mapAgentHintToDomain(agentName) {
  const lower = agentName.toLowerCase();
  if (lower.includes('inventory') || lower.includes('stock')) return 'inventory';
  if (lower.includes('crm') || lower.includes('lead') || lower.includes('customer')) return 'crm';
  if (lower.includes('finance') || lower.includes('financial')) return 'finance';
  if (lower.includes('marketing') || lower.includes('digital') || lower.includes('seo')) return 'marketing';
  if (lower.includes('gst') || lower.includes('compliance') || lower.includes('tax')) return 'compliance';
  if (lower.includes('market intel') || lower.includes('intelligence') || lower.includes('news')) return 'market_intel';
  if (lower.includes('support') || lower.includes('customer support')) return 'support';
  if (lower.includes('analytics') || lower.includes('report')) return 'analytics';
  return detectIntent(agentName);
}

export const DOMAIN_LABELS = {
  inventory: 'Inventory Agent',
  crm: 'CRM Agent',
  finance: 'Finance Agent',
  marketing: 'Marketing Agent',
  compliance: 'Compliance Agent',
  market_intel: 'Market Intelligence Agent',
  support: 'Customer Support Agent',
  analytics: 'Analytics Agent',
  general: 'All-Agent Orchestrator',
};
