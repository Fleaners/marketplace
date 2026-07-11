const fetch = require('node-fetch');

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.MP_GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return { apiKey };
}

// Helper to generate dynamic, personalized simulated retail consulting responses in offline/no-key mode
function getDynamicSimulatedResponse(rawPrompt) {
  let context = {};
  try {
    const contextMatch = rawPrompt.match(/Business Context:\s*([\s\S]+?)\s*User Question:/);
    if (contextMatch && contextMatch[1]) {
      context = JSON.parse(contextMatch[1].trim());
    }
  } catch (e) {}

  const sellerName = context.sellerProfile?.name || 'Gaurav Enterprise';
  const category = context.sellerProfile?.category || 'Electrical & Industrial';
  const location = context.sellerProfile?.location || 'India';
  const verified = context.sellerProfile?.verified || false;
  const products = context.productsSummary || [];
  const inquiriesCount = context.inquiriesCount || 0;

  let userQuestion = "";
  try {
    const questionMatch = rawPrompt.match(/User Question:\s*([\s\S]+)$/);
    if (questionMatch && questionMatch[1]) {
      userQuestion = questionMatch[1].trim();
    }
  } catch (e) {}
  if (!userQuestion) {
    userQuestion = rawPrompt;
  }
  const lowerQuestion = userQuestion.toLowerCase();

  if (lowerQuestion.includes('title') || lowerQuestion.includes('name') || lowerQuestion.includes('heading')) {
    if (products.length === 0) {
      return `Namaste! For your business **${sellerName}** selling **${category}** products, here is how you can improve your listing titles for B2B search:
- **Formula:** [Brand] + [Product Type] + [Key Specification/Material] + (Wholesale / Bulk MOQ)
- **Example:** "Gaurav Premium PVC Pipes - heavy duty 2 inch coupler (MOQ: 50 pieces)"`;
    }
    const titleSuggestions = products.map(p => {
      const cleanName = p.name ? p.name.split('(')[0].trim() : 'Product';
      return `- **Original:** "${p.name || 'Listing'}"\n  👉 **Optimized B2B Title:** "${cleanName} - Bulk Wholesale Pack (MOQ: ${p.moq || 5} units)"`;
    }).slice(0, 3).join('\n');
    
    return `Namaste! Based on your active **${category}** catalog, here are optimized B2B listing title recommendations to improve click-through rates on marketplace.store:

${titleSuggestions}

*Tip:* Including specific materials, packaging dimensions, and wholesale MOQ details directly in the product title increases inquiries by up to 35%.`;
  }

  if (lowerQuestion.includes('seo') || lowerQuestion.includes('keyword') || lowerQuestion.includes('search') || lowerQuestion.includes('rank')) {
    const pName = products.length > 0 && products[0].name ? products[0].name.split('(')[0].trim() : 'Industrial components';
    return `Here is a custom search engine SEO optimization plan for **${sellerName}** located in **${location}**:

### 🎯 Targeted B2B Keywords for your Catalog:
1. **Primary High-Intent Keywords:**
   - "Bulk ${pName} supplier"
   - "Wholesale ${category.toLowerCase()} market India"
   - "${category} distributors in ${location}"
2. **Long-Tail Search Queries:**
   - "${pName} manufacturers with GST invoice"
   - "Heavy-duty ${pName.toLowerCase()} wholesale price"

### 📈 Action Plan to Increase Search Ranks:
* **Add HSN Codes:** Ensure every product description lists its correct 4 or 8-digit HSN code.
* **Specify Local Availability:** Mention shipping lead times to major trading hubs (e.g. Noida, Delhi-NCR, Mumbai).`;
  }

  if (lowerQuestion.includes('stock') || lowerQuestion.includes('inventory') || lowerQuestion.includes('restock')) {
    const lowStockProducts = products.filter(p => Number(p.stock || 0) <= Number(p.moq || 0));
    if (lowStockProducts.length === 0) {
      return `Excellent! All items in your **${category}** catalog are currently well-stocked. Here is your inventory health summary:
- **Total Products Tracked:** ${products.length}
- **Low Stock Threshold Alerts:** 0
- **Operational Strategy:** Maintain your current buffer stock levels. Review inventory counts weekly before bulk dispatch cycles.`;
    }
    
    const listText = lowStockProducts.map(p => `- **${p.name || 'Item'}** (Current Stock: **${p.stock}** | Wholesale MOQ: **${p.moq}**)`).join('\n');
    return `⚠️ **Critical Stock Replenishment Alert** for **${sellerName}**:

The following products are running below their minimum order quantity (MOQ) safety threshold and need immediate restocking to prevent missing B2B buyer leads:

${listText}

### 📋 Recommended Action Plan:
1. **Safety Buffer:** Increase stock for these items by at least **20-30 units** immediately.
2. **MOQ Alignment:** Ensure your catalog minimum order quantities (MOQ) align with standard bulk packaging sizes to optimize shipping costs.`;
  }

  if (lowerQuestion.includes('inquir') || lowerQuestion.includes('lead') || lowerQuestion.includes('whatsapp') || lowerQuestion.includes('convers')) {
    const gstBadgeText = verified 
      ? "🏅 **GST Verified Status:** Activated. Your products display the verification badge which boosts CTR." 
      : "⚠️ **GST Verification Pending:** Complete your GST Verification in settings. Displaying a verified badge increases click-through rates from trade buyers by **40%**.";
      
    return `Here is a custom checklist to maximize B2B lead generation for **${sellerName}** (Category: **${category}**):

### 📞 1. Speed-to-Response Score
* You have received **${inquiriesCount} inquiries** in total.
* B2B buyers contact multiple dealers simultaneously. Responding to WhatsApp click leads within **10 minutes** increases your conversion rate by 5x.

### 🎖️ 2. Verification and Trust
* ${gstBadgeText}

### 📦 3. Catalog Complete Metrics
* Ensure all your **${products.length} listed products** have spec sheets, clear MOQs, and bulk shipping lead times.`;
  }

  return `Namaste! Here is a tailored business analysis for **${sellerName}**:
- **Store Category:** ${category} (${location})
- **Catalog Health:** Tracked **${products.length} products** with **${inquiriesCount} inquiries** in your leads list.
- **Action Plan:** To scale business growth, optimize your top listing search titles, ensure HSN codes are added to descriptions, and respond promptly to incoming B2B RFQs.`;
}

async function askGeminiAgent(prompt, systemInstruction = '', options = {}) {
  const trimmedPrompt = typeof prompt === 'string' ? prompt.trim() : '';
  if (!trimmedPrompt) {
    throw new Error('Prompt is required');
  }

  const config = getGeminiConfig();
  if (config) {
    try {
      const { apiKey } = config;
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

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
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
      });

      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        const candidate = payload.candidates?.[0];
        const answer = candidate?.content?.parts?.[0]?.text || '';
        if (answer.trim()) {
          return {
            answer: answer.trim(),
            model: 'gemini-1.5-flash',
          };
        }
      }
      console.warn('Gemini request failed, falling back to dynamic simulated assistant:', payload);
    } catch (apiError) {
      console.warn('Gemini API connection error, falling back to dynamic simulated assistant:', apiError);
    }
  }

  return {
    answer: getDynamicSimulatedResponse(trimmedPrompt),
    model: 'simulated-retail-assistant',
  };
}

module.exports = { askGeminiAgent };
