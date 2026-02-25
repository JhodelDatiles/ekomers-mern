/**
 * Order Confirmation Template
 * Optimized for dark/light modes and includes defensive mapping
 */
export const orderConfirmationEmail = (order, user) => {
  // Defensive check for items array to prevent server crash
  const items = order?.items || [];
  const userName = user?.username || "Valued Customer";
  const total = order?.totalAmount ? Number(order.totalAmount).toLocaleString() : "0.00";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; padding: 0; border: 1px solid #eeeeee; }
        .header { background: #000000; color: #ffffff; padding: 40px 20px; text-align: center; }
        .header h1 { margin: 0; text-transform: uppercase; font-style: italic; letter-spacing: -1px; }
        .content { padding: 30px; background: #ffffff; }
        .order-meta { margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #f4f4f4; }
        .item-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f9f9f9; }
        .item-info { flex-grow: 1; }
        .item-price { text-align: right; font-weight: bold; }
        .total-section { margin-top: 25px; padding: 20px; background: #f9f9f9; text-align: right; }
        .total-label { font-size: 14px; text-transform: uppercase; opacity: 0.6; }
        .total-amount { font-size: 24px; font-weight: 900; color: #000; font-style: italic; }
        .footer { text-align: center; padding: 30px; font-size: 12px; color: #999999; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ORDER CONFIRMED</h1>
        </div>
        <div class="content">
          <p>Hi <strong>${userName}</strong>,</p>
          <p>Your order has been received and is now being prepared for shipment. Here's your summary:</p>
          
          <div class="order-meta">
            <p style="margin: 0; font-size: 12px; color: #666;">Order ID: #${order?._id || 'N/A'}</p>
            <p style="margin: 0; font-size: 12px; color: #666;">Date: ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="items-list">
            ${items.map(item => `
              <div class="item-row">
                <div class="item-info">
                  <span style="display: block; font-weight: bold; text-transform: uppercase;">${item.name}</span>
                  <span style="font-size: 11px; color: #666;">QTY: ${item.quantity} | SIZE: ${item.size}</span>
                </div>
                <div class="item-price">
                  ₱${Number(item.price * item.quantity).toLocaleString()}
                </div>
              </div>
            `).join('')}
          </div>

          <div class="total-section">
            <span class="total-label">Amount Paid</span><br/>
            <span class="total-amount">₱${total}</span>
          </div>

          <p style="margin-top: 30px; font-size: 13px;">
            <strong>Shipping to:</strong><br/>
            ${order?.shippingInfo?.fullName || userName}<br/>
            ${order?.shippingInfo?.address}, ${order?.shippingInfo?.city}
          </p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} EKOMERS STREETWEAR. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Security Verification Template
 */
export const verificationEmailTemplate = (user, code, type) => {
  const isDeletion = type === 'delete';
  const title = isDeletion ? 'TERMINATE ACCOUNT' : 'PASSWORD UPDATE';
  const accentColor = isDeletion ? '#ff4d4d' : '#000000';

  return `
    <div style="background-color: #ffffff; color: #000; padding: 40px; font-family: sans-serif; text-align: center; border: 1px solid #eee;">
      <h1 style="color: ${accentColor}; font-style: italic; text-transform: uppercase; margin: 0;">${title}</h1>
      <p style="letter-spacing: 2px; font-size: 12px; opacity: 0.5; margin-bottom: 30px;">SECURITY PROTOCOL V2.0</p>
      <div style="background: #f4f4f4; padding: 30px; margin: 20px auto; border: 1px dashed #ccc; font-size: 40px; letter-spacing: 12px; width: fit-content;">
        <strong>${code}</strong>
      </div>
      <p style="font-size: 11px; opacity: 0.6;">THIS CODE EXPIRES IN 10 MINUTES. DO NOT SHARE THIS CODE.</p>
    </div>
  `;
};