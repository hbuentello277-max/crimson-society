import { formatCentsUsd, formatDeliveryMethodLabel, shortOrderId } from "@/lib/shop/orders";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const BRAND = "#b4141e";
const BG = "#050405";
const TEXT = "#f1c3c7";
const MUTED = "#a1a1aa";

export type OrderEmailLine = {
  product_name: string;
  size: string | null;
  quantity: number;
  line_total_cents: number;
};

function layout(title: string, bodyHtml: string, ctaHref: string, ctaLabel: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:${BG};font-family:Georgia,'Times New Roman',serif;color:#e4e4e7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#0c0c0d;border:1px solid rgba(180,20,30,0.35);border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 24px 12px;text-align:center;">
          <p style="margin:0;font-size:11px;letter-spacing:0.35em;text-transform:uppercase;color:${BRAND};">Crimson Society</p>
          <h1 style="margin:12px 0 0;font-size:22px;font-weight:normal;font-style:italic;color:#fff;">${title}</h1>
        </td></tr>
        <tr><td style="padding:8px 24px 24px;font-size:15px;line-height:1.6;color:${TEXT};font-family:system-ui,sans-serif;">
          ${bodyHtml}
          <p style="margin:28px 0 0;text-align:center;">
            <a href="${ctaHref}" style="display:inline-block;padding:12px 24px;border-radius:999px;border:1px solid ${BRAND};background:rgba(180,20,30,0.15);color:${TEXT};font-size:11px;letter-spacing:0.2em;text-transform:uppercase;text-decoration:none;">${ctaLabel}</a>
          </p>
        </td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:${MUTED};font-family:system-ui,sans-serif;text-align:center;">
          Transactional message · Crimson Society shop
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function lineItemsHtml(items: OrderEmailLine[]) {
  const rows = items
    .map(
      (item) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:#fff;font-family:system-ui,sans-serif;">
          ${item.product_name}${item.size ? ` · Size ${item.size}` : ""}<br/>
          <span style="font-size:12px;color:${MUTED};">Qty ${item.quantity}</span>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.08);text-align:right;color:${BRAND};font-family:system-ui,sans-serif;">
          ${formatCentsUsd(item.line_total_cents)}
        </td>
      </tr>`,
    )
    .join("");

  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">${rows}</table>`;
}

function totalsHtml(subtotal: number, shipping: number, total: number, deliveryLabel: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;font-family:system-ui,sans-serif;font-size:14px;">
    <tr><td style="color:${MUTED};padding:4px 0;">Subtotal</td><td style="text-align:right;color:#fff;">${formatCentsUsd(subtotal)}</td></tr>
    <tr><td style="color:${MUTED};padding:4px 0;">Shipping</td><td style="text-align:right;color:#fff;">${shipping === 0 ? "Free" : formatCentsUsd(shipping)}</td></tr>
    <tr><td style="color:${MUTED};padding:8px 0 4px;border-top:1px solid rgba(255,255,255,0.1);">Total</td><td style="text-align:right;color:${BRAND};font-size:18px;padding-top:8px;">${formatCentsUsd(total)}</td></tr>
    <tr><td colspan="2" style="padding-top:12px;color:${MUTED};font-size:12px;">Delivery: ${deliveryLabel}</td></tr>
  </table>`;
}

export function orderConfirmationEmailHtml(input: {
  orderId: string;
  items: OrderEmailLine[];
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  delivery_method: string;
  orderUrl: string;
}) {
  const shortId = shortOrderId(input.orderId);
  const deliveryLabel = formatDeliveryMethodLabel(input.delivery_method);
  const body = `
    <p style="margin:0 0 16px;">Thank you for your order. We received your payment for order <strong>#${shortId}</strong>.</p>
    ${lineItemsHtml(input.items)}
    ${totalsHtml(input.subtotal_cents, input.shipping_cents, input.total_cents, deliveryLabel)}
  `;
  return {
    subject: "Your Crimson Society order is confirmed",
    html: layout("Order confirmed", body, input.orderUrl, "View order"),
  };
}

export function readyForPickupEmailHtml(input: {
  orderId: string;
  pickup_note: string | null;
  orderUrl: string;
}) {
  const shortId = shortOrderId(input.orderId);
  const noteBlock = input.pickup_note
    ? `<p style="margin:16px 0;padding:12px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:#d4d4d8;">${escapeHtml(input.pickup_note)}</p>`
    : "";
  const body = `
    <p style="margin:0 0 16px;">Your order <strong>#${shortId}</strong> is <strong style="color:#7dd3fc;">ready for pickup</strong>.</p>
    ${noteBlock}
    <p style="margin:16px 0 0;color:${MUTED};font-size:14px;">Check your order page for details before you arrive.</p>
  `;
  return {
    subject: "Your Crimson Society order is ready for pickup",
    html: layout("Ready for pickup", body, input.orderUrl, "View order"),
  };
}

export function shippedEmailHtml(input: {
  orderId: string;
  tracking_carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  customer_note: string | null;
  orderUrl: string;
}) {
  const shortId = shortOrderId(input.orderId);
  const trackingParts = [
    input.tracking_carrier
      ? `<p style="margin:0;"><strong>Carrier:</strong> ${escapeHtml(input.tracking_carrier)}</p>`
      : "",
    input.tracking_number
      ? `<p style="margin:8px 0 0;"><strong>Tracking:</strong> <span style="font-family:monospace;">${escapeHtml(input.tracking_number)}</span></p>`
      : "",
    input.tracking_url && /^https?:\/\//i.test(input.tracking_url)
      ? `<p style="margin:12px 0 0;"><a href="${escapeHtml(input.tracking_url)}" style="color:${BRAND};">Track your package</a></p>`
      : "",
  ].join("");
  const noteBlock = input.customer_note
    ? `<p style="margin:16px 0 0;padding:12px;border-radius:8px;background:rgba(255,255,255,0.04);color:#d4d4d8;">${escapeHtml(input.customer_note)}</p>`
    : "";
  const body = `
    <p style="margin:0 0 16px;">Your order <strong>#${shortId}</strong> has shipped.</p>
    <div style="padding:12px;border-radius:8px;background:rgba(14,116,144,0.12);border:1px solid rgba(56,189,248,0.25);font-family:system-ui,sans-serif;font-size:14px;">
      ${trackingParts || "<p style='margin:0;color:#a1a1aa;'>Tracking details will appear on your order page.</p>"}
    </div>
    ${noteBlock}
  `;
  return {
    subject: "Your Crimson Society order has shipped",
    html: layout("Order shipped", body, input.orderUrl, "View order"),
  };
}
