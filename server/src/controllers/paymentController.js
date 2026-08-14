import { config } from "../envconfig.js";
import Order from "../models/orderSchema.js";
import Cart from "../models/cartSchema.js";
import Product from "../models/productSchema.js";
import axios from "axios";

export const createQrPhPayment = async (req, res) => {
  try {
    const {
      shippingInfo,
      isDirectPurchase,
      directProductId,
      directQuantity,
      directSize,
      selectedCartItemIds,
    } = req.body;

    const userId = req.user.id;
    const secretKey = config.paymongoSecret.trim();
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;

    let orderItems;
    let serverTotal;

    if (isDirectPurchase) {
      // ── DIRECT / BUY NOW ──
      if (!directProductId || !directSize || !directQuantity) {
        return res
          .status(400)
          .json({ message: "Missing direct purchase details" });
      }
      const product = await Product.findById(directProductId);
      if (!product)
        return res.status(404).json({ message: "Product not found" });

      const sizeData = product.sizes?.find((s) => s.size === directSize);
      if (!sizeData || sizeData.stock < directQuantity) {
        return res
          .status(400)
          .json({ message: "Insufficient stock for selected size" });
      }

      const serverPrice = sizeData.price;
      serverTotal = serverPrice * directQuantity;
      orderItems = [
        {
          productId: product._id,
          name: product.name,
          price: serverPrice,
          quantity: directQuantity,
          size: directSize,
          image: product.images?.[0]?.url,
        },
      ];
    } else {
      // ── CART CHECKOUT — only selected items ──
      const cart = await Cart.findOne({ userId }).populate("items.productId");
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }

      // SECURITY: filter to selected items, calculate total server-side
      const selectedIds = selectedCartItemIds || [];
      console.log("🔍 selectedIds from frontend:", JSON.stringify(selectedIds));
      console.log(
        "🔍 all cart item IDs:",
        cart.items.map((i) => String(i._id)),
      );
      const selectedItems2 = cart.items.filter((item) =>
        selectedIds.includes(String(item._id)),
      );
      console.log("🔍 matched items count:", selectedItems2.length);
      const selectedItems =
        selectedIds.length > 0
          ? cart.items.filter((item) => selectedIds.includes(String(item._id)))
          : cart.items;

      if (selectedItems.length === 0) {
        return res
          .status(400)
          .json({ message: "No matching cart items found" });
      }

      serverTotal = selectedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      orderItems = selectedItems.map((item) => ({
        productId: item.productId._id,
        name: item.productId.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size || "N/A",
        image: item.productId?.images?.[0]?.url,
        cartItemId: String(item._id),
      }));
    }

    const amountInCentavos = Math.round(serverTotal * 100);

    // Step 1: Create Payment Intent with server-calculated amount
    const intentRes = await axios.post(
      "https://api.paymongo.com/v1/payment_intents",
      {
        data: {
          attributes: {
            amount: amountInCentavos,
            payment_method_allowed: ["qrph"],
            currency: "PHP",
            description: "EKOMERS Order Payment",
            metadata: { userId: String(userId) },
          },
        },
      },
      {
        headers: {
          authorization: authHeader,
          "Content-Type": "application/json",
        },
      },
    );

    const paymentIntentId = intentRes.data.data.id;
    const clientKey = intentRes.data.data.attributes.client_key;

    // Step 2: Create QR PH Payment Method
    const methodRes = await axios.post(
      "https://api.paymongo.com/v1/payment_methods",
      {
        data: { attributes: { type: "qrph" } },
      },
      {
        headers: {
          authorization: authHeader,
          "Content-Type": "application/json",
        },
      },
    );

    const paymentMethodId = methodRes.data.data.id;

    // Step 3: Attach Payment Method to Intent
    const attachRes = await axios.post(
      `https://api.paymongo.com/v1/payment_intents/${paymentIntentId}/attach`,
      {
        data: {
          attributes: {
            payment_method: paymentMethodId,
            client_key: clientKey,
          },
        },
      },
      {
        headers: {
          authorization: authHeader,
          "Content-Type": "application/json",
        },
      },
    );

    const attrs = attachRes.data.data.attributes;
    const qrImage =
      attrs.next_action?.code?.image_url || attrs.next_action?.data?.image_url;

    // Save pending order with server-verified data.
    // createdAt is intentionally NOT set here — it will be stamped when
    // payment is confirmed (webhook or fallback), so the timestamp reflects
    // when the user actually paid, not when the QR was generated.
    await Order.create({
      userId,
      paymentIntentId,
      items: orderItems.map((i) => ({
        productId: i.productId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        size: i.size,
        image: i.image,
      })),
      totalAmount: serverTotal,
      shippingInfo,
      paymentMethod: "qrph",
      paymentStatus: "pending",
      status: "Pending",
      isDirectPurchase: !!isDirectPurchase,
      createdAt: null, // will be overwritten on confirmation
    });

    console.log(
      `✅ QR PH pending order: ${paymentIntentId} (${orderItems.length} items, ₱${serverTotal})`,
    );
    res.status(200).json({ paymentIntentId, qrImage, status: attrs.status });
  } catch (error) {
    console.error("❌ QR PH Error:", error.response?.data || error.message);
    res.status(500).json({ message: "QR PH payment failed" });
  }
};

export const checkPaymentIntentStatus = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const secretKey = config.paymongoSecret.trim();
    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;

    const response = await axios.get(
      `https://api.paymongo.com/v1/payment_intents/${paymentIntentId}`,
      { headers: { authorization: authHeader } },
    );

    const status = response.data.data.attributes.status;
    res.status(200).json({ status });
  } catch (error) {
    res.status(500).json({ message: "Failed to check status" });
  }
};
