import {
  formatCentsUsd,
  formatDeliveryMethodLabel,
  shortOrderId,
} from "@/lib/shop/orders";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CRIMSON = "#b4141e";
const CRIMSON_SOFT = "#e87a82";
const BG = "#050405";
const CARD = "#0a0a0b";
const CARD_INNER = "#111113";
const TEXT = "#f1c3c7";
const MUTED = "#a1a1aa";
const TAGLINE = "Built Different. Ride Different.";

export type OrderEmailLine = {
  product_name: string;
  size: string | null;
  quantity: number;
  line_total_cents: number;
};

function layout(title: string, bodyHtml: string, ctaHref: string, ctaLabel: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="dark"/>
  <meta name="supported-color-schemes" content="dark"/>
</head>
<body style="margin:0;padding:0;background:${BG};color:${TEXT};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${escapeHtml(TAGLINE)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${CARD};border:1px solid rgba(180,20,30,0.45);border-radius:20px;overflow:hidden;">
        <tr><td style="padding:0;background:linear-gradient(180deg,rgba(180,20,30,0.22) 0%,rgba(5,4,5,0) 100%);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:28px 24px 8px;text-align:center;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:11px;letter-spacing:0.38em;text-transform:uppercase;color:${CRIMSON_SOFT};">Crimson Society</p>
              <p style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:13px;font-style:italic;letter-spacing:0.12em;color:${MUTED};">${TAGLINE}</p>
            </td></tr>
            <tr><td style="padding:8px 24px 20px;text-align:center;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:normal;font-style:italic;color:#ffffff;line-height:1.25;">${title}</h1>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 24px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${TEXT};">
          ${bodyHtml}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
            <tr><td align="center">
              <a href="${ctaHref}" style="display:inline-block;padding:14px 28px;border-radius:999px;border:1px solid ${CRIMSON};background:rgba(180,20,30,0.22);color:#ffffff;font-size:11px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;text-decoration:none;">${ctaLabel}</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:18px 24px 22px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <p style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:12px;font-style:italic;color:${CRIMSON_SOFT};">${TAGLINE}</p>
          <p style="margin:0;font-size:11px;color:${MUTED};">Transactional message · Crimson Society Shop</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function orderCard(innerHtml: string) {
  return `<div style="margin:20px 0 0;padding:16px;border-radius:14px;background:${CARD_INNER};border:1px solid rgba(255,255,255,0.08);">${innerHtml}</div>`;
}

function lineItemsHtml(items: OrderEmailLine[]) {
  const rows = items
    .map(
      (item) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:#ffffff;font-size:14px;">
          <strong>${escapeHtml(item.product_name)}</strong>
          ${item.size ? `<br/><span style="font-size:12px;color:${MUTED};">Size ${escapeHtml(item.size)} · Qty ${item.quantity}</span>` : `<br/><span style="font-size:12px;color:${MUTED};">Qty ${item.quantity}</span>`}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);text-align:right;color:${CRIMSON_SOFT};font-size:14px;white-space:nowrap;">
          ${formatCentsUsd(item.line_total_cents)}
        </td>
      </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

function totalsHtml(
  subtotal: number,
  shipping: number,
  total: number,
  deliveryLabel: string,
  deliveryMethod: string,
) {
  const deliveryRowLabel = deliveryMethod === "local_pickup" ? "Pickup" : "Shipping";

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;font-size:14px;">
    <tr><td style="color:${MUTED};padding:4px 0;">Subtotal</td><td style="text-align:right;color:#fff;">${formatCentsUsd(subtotal)}</td></tr>
    <tr><td style="color:${MUTED};padding:4px 0;">${deliveryRowLabel}</td><td style="text-align:right;color:#fff;">${shipping === 0 ? "Free" : formatCentsUsd(shipping)}</td></tr>
    <tr><td style="color:${MUTED};padding:10px 0 4px;border-top:1px solid rgba(255,255,255,0.1);">Total</td><td style="text-align:right;color:${CRIMSON_SOFT};font-size:20px;font-family:Georgia,'Times New Roman',serif;font-style:italic;padding-top:10px;">${formatCentsUsd(total)}</td></tr>
    <tr><td colspan="2" style="padding-top:12px;color:${MUTED};font-size:12px;">Delivery: ${escapeHtml(deliveryLabel)}</td></tr>
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
    <p style="margin:0;color:${TEXT};">Your order is locked in. We received your payment and your Crimson Society piece is now in the queue.</p>
    ${orderCard(`
      <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${MUTED};">Order #${shortId}</p>
      ${lineItemsHtml(input.items)}
      ${totalsHtml(input.subtotal_cents, input.shipping_cents, input.total_cents, deliveryLabel, input.delivery_method)}
    `)}
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
    ? `<p style="margin:14px 0 0;padding:12px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:#d4d4d8;font-size:14px;">${escapeHtml(input.pickup_note)}</p>`
    : "";
  const body = `
    <p style="margin:0;color:${TEXT};">Your Crimson Society order is ready. Check your order details for pickup notes.</p>
    ${orderCard(`
      <p style="margin:0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${MUTED};">Order #${shortId}</p>
      <p style="margin:10px 0 0;font-size:16px;color:#7dd3fc;font-weight:600;">Ready for pickup</p>
      ${noteBlock}
    `)}
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
      ? `<p style="margin:0;color:#fff;"><strong style="color:${MUTED};">Carrier</strong><br/>${escapeHtml(input.tracking_carrier)}</p>`
      : "",
    input.tracking_number
      ? `<p style="margin:12px 0 0;color:#fff;"><strong style="color:${MUTED};">Tracking number</strong><br/><span style="font-family:monospace;font-size:14px;">${escapeHtml(input.tracking_number)}</span></p>`
      : "",
    input.tracking_url && /^https?:\/\//i.test(input.tracking_url)
      ? `<p style="margin:14px 0 0;"><a href="${escapeHtml(input.tracking_url)}" style="color:${CRIMSON_SOFT};font-size:13px;font-weight:600;text-decoration:underline;">Track your package</a></p>`
      : "",
  ]
    .filter(Boolean)
    .join("");
  const noteBlock = input.customer_note
    ? `<p style="margin:14px 0 0;padding:12px;border-radius:10px;background:rgba(255,255,255,0.04);color:#d4d4d8;font-size:14px;">${escapeHtml(input.customer_note)}</p>`
    : "";
  const body = `
    <p style="margin:0;color:${TEXT};">Your Crimson Society order is on the move.</p>
    ${orderCard(`
      <p style="margin:0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${MUTED};">Order #${shortId}</p>
      <div style="margin-top:12px;padding:14px;border-radius:10px;background:rgba(14,116,144,0.12);border:1px solid rgba(56,189,248,0.25);font-size:14px;">
        ${trackingParts || `<p style="margin:0;color:${MUTED};">Tracking details are on your order page.</p>`}
      </div>
      ${noteBlock}
    `)}
  `;
  return {
    subject: "Your Crimson Society order has shipped",
    html: layout("Your order has shipped", body, input.orderUrl, "View order"),
  };
}
