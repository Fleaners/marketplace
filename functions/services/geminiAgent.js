
function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
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

  // Helper to generate dynamic, personalized simulated retail consulting responses
  const getDynamicSimulatedResponse = (rawPrompt) => {
    let context = {};
    try {
      const contextMatch = rawPrompt.match(/Business Context:\s*([\s\S]+?)\s*User Question:/);
      if (contextMatch && contextMatch[1]) {
        context = JSON.parse(contextMatch[1].trim());
      }
    } catch (e) {
      console.warn("Failed to parse business context from prompt", e);
    }

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
    } catch (e) {
      console.warn("Failed to extract user question from prompt", e);
    }
    if (!userQuestion) {
      userQuestion = rawPrompt;
    }
    const lowerQuestion = userQuestion.toLowerCase();

    // 1. Improve my product title
    if (lowerQuestion.includes('title') || lowerQuestion.includes('name') || lowerQuestion.includes('heading')) {
      if (products.length === 0) {
        return `Namaste! For your business **${sellerName}** selling **${category}** products, here is how you can improve your listing titles for B2B search:
- **Formula:** [Brand] + [Product Type] + [Key Specification/Material] + (Wholesale / Bulk MOQ)
- **Example:** "Gaurav Premium PVC Pipes - heavy duty 2 inch coupler (MOQ: 50 pieces)"`;
      }
      const titleSuggestions = products.map(p => {
        const cleanName = p.name.split('(')[0].trim();
        return `- **Original:** "${p.name}"\n  👉 **Optimized B2B Title:** "${cleanName} - Bulk Wholesale Pack (MOQ: ${p.moq || 5} units)"`;
      }).slice(0, 3).join('\n');
      
      return `Namaste! Based on your active **${category}** catalog, here are optimized B2B listing title recommendations to improve click-through rates on marketplace.store:

${titleSuggestions}

*Tip:* Including specific materials, packaging dimensions, and wholesale MOQ details directly in the product title increases inquiries by up to 35%.`;
    }

    // 2. Suggest better SEO keywords
    if (lowerQuestion.includes('seo') || lowerQuestion.includes('keyword') || lowerQuestion.includes('search') || lowerQuestion.includes('rank')) {
      const pName = products.length > 0 ? products[0].name.split('(')[0].trim() : 'Industrial components';
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

    // 3. Which products need restocking?
    if (lowerQuestion.includes('stock') || lowerQuestion.includes('inventory') || lowerQuestion.includes('restock')) {
      const lowStockProducts = products.filter(p => Number(p.stock) <= Number(p.moq));
      if (lowStockProducts.length === 0) {
        return `Excellent! All items in your **${category}** catalog are currently well-stocked. Here is your inventory health summary:
- **Total Products Tracked:** ${products.length}
- **Low Stock Threshold Alerts:** 0
- **Operational Strategy:** Maintain your current buffer stock levels. Review inventory counts weekly before bulk dispatch cycles.`;
      }
      
      const listText = lowStockProducts.map(p => `- **${p.name}** (Current Stock: **${p.stock}** | Wholesale MOQ: **${p.moq}**)`).join('\n');
      return `⚠️ **Critical Stock Replenishment Alert** for **${sellerName}**:

The following products are running below their minimum order quantity (MOQ) safety threshold and need immediate restocking to prevent missing B2B buyer leads:

${listText}

### 📋 Recommended Action Plan:
1. **Safety Buffer:** Increase stock for these items by at least **20-30 units** immediately.
2. **MOQ Alignment:** Ensure your catalog minimum order quantities (MOQ) align with standard bulk packaging sizes to optimize shipping costs.`;
    }

    // 4. How can I increase inquiries? / leads / conversion
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
* Ensure all your **${products.length} listed products** have technical spec sheets, clear minimum order quantities (MOQs), and bulk shipping lead times.`;
    }

    // 5. Why are my product views decreasing?
    if (lowerQuestion.includes('view') || lowerQuestion.includes('visit') || lowerQuestion.includes('decreas')) {
      return `Here is a diagnostic report on search visibility and catalog views for **${sellerName}**:

### 🔍 Root Causes of View Fluctuations:
1. **Title SEO Gaps:** Plain titles without specs (like dimensions, material grade, or HSN) match fewer search index pages.
2. **Missing Local Search Anchor:** Trade buyers frequently search by region (e.g. "coupling joints in Lucknow").
3. **Response Rate Rank:** The marketplace discovery rank rewards active sellers. Delayed responses to your recent leads will lower your search ranking.

### 🛠️ Immediate Fixes:
* Update product descriptions to include: *"Trusted wholesale suppliers of ${category.toLowerCase()} across ${location} and North India."*
* Complete your seller address profile (State, Pin code) to capture nearby buyers.`;
    }

    // 6. GST or Tax Inquiries
    if (lowerQuestion.includes('gst') || lowerQuestion.includes('tax') || lowerQuestion.includes('invoice')) {
      const gstNumText = verified ? "Your profile has verified GST active." : "Your profile currently has GST verification pending.";
      return `Under Indian GST regulations, trade transactions require compliant tax invoicing:
- **GST Slabs:** Slabs are structured at 5%, 12%, 18%, and 28%. Most industrial goods and components fall under the 18% slab.
- **Input Tax Credit (ITC):** A key benefit of GST registration is claiming ITC on purchases, directly reducing your operational tax liability.
- **Interstate vs. Intrastate:** Intrastate sales attract equal parts CGST and SGST, while interstate sales attract integrated IGST.
- **Threshold Limit:** The mandatory registration threshold is ₹40 Lakhs for goods and ₹20 Lakhs for services in most states.

*Status:* ${gstNumText}`;
    }

    // Default Fallback
    return `Namaste! Here is a tailored business analysis for **${sellerName}**:
- **Store Category:** ${category} (${location})
- **Catalog Health:** Tracked **${products.length} products** with **${inquiriesCount} inquiries** in your leads list.
- **Action Plan:** To scale business growth, optimize your top listing search titles, ensure HSN codes are added to descriptions, and respond promptly to incoming B2B RFQs.`;
  };

  const config = getGeminiConfig();
  if (config) {
    try {
      const { apiKey } = config;
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
      console.warn('Gemini request failed, falling back to dynamic simulated assistant. Response payload:', payload);
    } catch (apiError) {
      console.warn('Gemini API connection error, falling back to dynamic simulated assistant. Error:', apiError);
    }
  }

  // Fallback to high-fidelity simulated response using parsed seller context data
  return {
    answer: getDynamicSimulatedResponse(trimmedPrompt),
    model: 'simulated-retail-assistant',
  };
}
