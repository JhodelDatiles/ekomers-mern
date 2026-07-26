import axios from 'axios';
import Product from '../../models/productSchema.js';
import Order from '../../models/orderSchema.js';
import AdminSettings from '../../models/adminSettingsSchema.js';

// ─────────────────────────────────────────────────────────────────
// BUILD SYSTEM PROMPT — pulls live data from DB so the bot always
// has accurate product, order, and store information to work with
// ─────────────────────────────────────────────────────────────────
const buildSystemPrompt = async (userId) => {
  try {
    // 1. Store settings (name, description, address, payment methods)
    const settings = await AdminSettings.findOne().lean();

    // 2. Active products — name, category, sizes, prices, description
    const products = await Product.find({ isActive: true })
      .select('name description category sizes basePrice colors')
      .lean();

    // 3. User's recent orders (last 5) — only if user is logged in
    let recentOrders = [];
    if (userId) {
      recentOrders = await Order.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('orderId status totalAmount items paymentMethod paymentStatus cancellationReason createdAt')
        .lean();
    }

    // ── Format products into readable text ──
    const productList = products.map(p => {
      const sizeInfo = p.sizes?.map(s =>
        `${s.size} (₱${s.price?.toLocaleString()}, stock: ${s.stock})`
      ).join(', ') || 'N/A';
      return `- ${p.name} | Category: ${p.category || 'N/A'} | Sizes & Prices: ${sizeInfo} | Colors: ${p.colors?.join(', ') || 'N/A'} | Description: ${p.description || 'N/A'}`;
    }).join('\n');

    // ── Format orders into readable text ──
    const orderList = recentOrders.length > 0
      ? recentOrders.map(o => {
          const items = o.items?.map(i => `${i.name} x${i.quantity} (${i.size})`).join(', ');
          return `- Order ${o.orderId || o._id.toString().slice(-8).toUpperCase()} | Status: ${o.status} | Payment: ${o.paymentMethod?.toUpperCase()} (${o.paymentStatus}) | Total: ₱${o.totalAmount?.toLocaleString()} | Items: ${items} | Date: ${new Date(o.createdAt).toLocaleDateString()}${o.cancellationReason ? ` | Cancelled because: ${o.cancellationReason}` : ''}`;
        }).join('\n')
      : 'No orders found for this user.';

    // ── Build the full system prompt ──
    return `You are the AI support assistant for ${settings?.storeName || 'EKOMERS'}, a streetwear e-commerce store based in the Philippines.

STORE INFO:
- Name: ${settings?.storeName || 'EKOMERS'}
- Description: ${settings?.storeDescription || 'Premium streetwear collections.'}
- Address: ${settings?.officeAddress?.street ? `${settings.officeAddress.street}, ${settings.officeAddress.barangay}, ${settings.officeAddress.city}` : 'Philippines'}
- Accepted payments: ${settings?.paymentMethods?.join(', ') || 'GCash, Maya, Card, QR PH'}
- Social: Facebook: ${settings?.socialLinks?.facebook || 'N/A'}, Instagram: ${settings?.socialLinks?.instagram || 'N/A'}

CURRENT PRODUCTS (live inventory):
${productList || 'No products available.'}

${userId ? `CUSTOMER'S RECENT ORDERS:\n${orderList}` : ''}

YOUR CAPABILITIES:
1. Answer questions about any product listed above — sizes available, price per size, stock, description, colors
2. Explain order statuses:
   - Pending: order received, awaiting processing
   - Order in Progress: being prepared/packed
   - Shipped/In Transit: on the way
   - Out for Delivery: with the courier, arriving today
   - Delivered: received by customer
   - Cancelled: cancelled, refund processed if applicable
3. Explain the cancellation and refund process:
   - Users can cancel before Shipped/In Transit
   - GCash/Maya/Card: automatic refund via PayMongo, 5–15 business days
   - QR PH: manual refund processed by the store team, they will contact you
4. Guide users on how to cancel: "Go to Dashboard → My Orders → expand the order → click Cancel Order"
5. Help with sizing: streetwear typically runs true to size; check the size chart per product
6. Answer general FAQs about the store

IMPORTANT RULES:
- Only answer questions about this store's products and orders — do not answer unrelated topics
- Never make up products, prices, or stock that are not in the list above
- Be friendly, concise, and use a casual streetwear brand tone — short sentences, helpful
- If a user asks about their specific order and you can see it above, give them the accurate status
- If you cannot answer something, say "Let me connect you with our support team" and suggest they use the "Chat with Seller" button on their order card
- Always respond in the same language the user writes in (Filipino or English)
- Keep responses under 150 words unless explaining a complex process`;

  } catch (err) {
    console.error('buildSystemPrompt error:', err.message);
    // Fallback minimal prompt if DB calls fail
    return `You are the AI support assistant for EKOMERS, a streetwear store in the Philippines. 
Help customers with product questions, order status, cancellations, and refunds. 
Be friendly and concise. If you cannot help, suggest they use the "Chat with Seller" button.`;
  }
};

// ─────────────────────────────────────────────────────────────────
// POST /api/ai-chat
// Body: { messages: [{ role, content }] }
// Sends conversation history to Groq and streams back a response
// ─────────────────────────────────────────────────────────────────
export const aiChat = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: 'messages array is required' });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      console.error('GROQ_API_KEY not set in environment');
      return res.status(500).json({ message: 'AI service not configured' });
    }

    // Build system prompt with live DB data
    // req.user exists because route uses protect middleware
    const systemPrompt = await buildSystemPrompt(req.user?.id);

    // Call Groq API
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.1-8b-instant',   // fast, free, good for support tasks
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-10) // last 10 messages for context window efficiency
        ],
        max_tokens: 300,
        temperature: 0.5
      },
      {
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    const reply = response.data.choices?.[0]?.message?.content;
    if (!reply) {
      return res.status(500).json({ message: 'No response from AI' });
    }

    res.status(200).json({ reply });

  } catch (err) {
    if (err.response?.data) {
      console.error('Groq API error:', JSON.stringify(err.response.data));
    } else {
      console.error('aiChat error:', err.message);
    }
    res.status(500).json({ message: 'AI service error. Please try again.' });
  }
};