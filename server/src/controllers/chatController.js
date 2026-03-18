import axios from 'axios';
import Product from '../models/productSchema.js';
import AdminSettings from '../models/adminSettingsSchema.js';

// Builds a rich system prompt using live DB data
const buildSystemPrompt = async () => {
  const [settings, products] = await Promise.all([
    AdminSettings.findOne().lean(),
    Product.find({ isActive: true })
      .select('name description category basePrice sizes colors stock')
      .limit(50)
      .lean(),
  ]);

  const storeName = settings?.storeName || 'MN+LA';
  const storeDesc = settings?.storeDescription || 'A fashion/clothing store.';
  const address = settings?.officeAddress
    ? `${settings.officeAddress.street || ''}, ${settings.officeAddress.barangay || ''}, ${settings.officeAddress.city || ''}, ${settings.officeAddress.country || 'Philippines'}`.replace(/^,\s*|,\s*$/g, '')
    : 'Philippines';
  const paymentMethods = settings?.paymentMethods?.join(', ') || 'GCash, Maya, Card';
  const social = settings?.socialLinks
    ? Object.entries(settings.socialLinks).map(([k, v]) => `${k}: ${v}`).join(' | ')
    : '';

  const byCategory = {};
  for (const p of products) {
    const cat = p.category || 'Uncategorized';
    if (!byCategory[cat]) byCategory[cat] = [];

    const prices = p.sizes?.map(s => s.price).filter(Boolean) || [];
    const minPrice = prices.length ? Math.min(...prices) : p.basePrice || 0;
    const maxPrice = prices.length ? Math.max(...prices) : p.basePrice || 0;
    const priceRange = minPrice === maxPrice ? `₱${minPrice}` : `₱${minPrice}–₱${maxPrice}`;
    const availableSizes = p.sizes?.filter(s => s.stock > 0).map(s => s.size).join(', ') || 'N/A';
    const colors = p.colors?.join(', ') || 'N/A';

    byCategory[cat].push(`- ${p.name} | ${priceRange} | Sizes: ${availableSizes} | Colors: ${colors}`);
  }

  const catalogText = Object.entries(byCategory)
    .map(([cat, items]) => `[${cat.toUpperCase()}]\n${items.join('\n')}`)
    .join('\n\n');

  return `You are a helpful customer support assistant for "${storeName}".

ABOUT THE STORE:
${storeDesc}
Office Address: ${address}
Payment Methods Accepted: ${paymentMethods}
${social ? `Social Media: ${social}` : ''}

CURRENT PRODUCT CATALOG (live from database):
${catalogText || 'No products currently listed.'}

YOUR ROLE:
- Answer questions about products, sizing, pricing, availability, colors, and categories using the catalog above.
- Help customers with order status, shipping, returns, and cancellations.
- If a customer asks about a specific order ID you cannot look up, tell them to check "My Orders" in their dashboard.
- Keep replies concise (2-4 sentences max unless listing products).
- If asked something unrelated to the store, politely redirect.
- Never make up details that aren't in the catalog or store info above.
- Always be friendly, professional, and on-brand for "${storeName}".`;
};

export const chat = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: 'Messages array is required.' });
    }

    const systemPrompt = await buildSystemPrompt();
    const trimmedMessages = messages.slice(-10);

    // Groq uses OpenAI-compatible format
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',
        max_tokens: 500,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          ...trimmedMessages, // role stays 'user'/'assistant' — no conversion needed
        ],
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const reply = response.data?.choices?.[0]?.message?.content
      || "Sorry, I couldn't process that. Please try again.";

    return res.json({ success: true, reply });
  } catch (error) {
    console.error('Chat controller error:', error?.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'Chat service temporarily unavailable.',
    });
  }
};