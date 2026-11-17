// Calculates a paid ticket preview and enforces the preview-only checkout rule.
/**
 * Paid Preview Service - Member 3: Authentication & Core Business Logic
 * Enforces the paid-event preview boundary required by Section 11 of the specification.
 */

export const PAID_PREVIEW_NOTICE = 'Online payment coming soon';

export function calculatePaidPreview(event, quantity = 1) {
  if (!event) {
    throw new Error('Event not found.');
  }

  const unitPrice = Number(event.price) || 0;
  const validQuantity = Math.max(1, Math.min(4, Math.floor(quantity)));
  const totalAmount = unitPrice * validQuantity;

  return {
    eventId: event.id,
    eventTitle: event.title,
    unitPrice: unitPrice,
    quantity: validQuantity,
    totalAmount: totalAmount,
    currency: 'LKR',
    formattedTotal: unitPrice === 0 ? 'Free' : `LKR ${totalAmount.toLocaleString('en-LK')}`,
    isPreviewOnly: true,
    message: PAID_PREVIEW_NOTICE,
    canProcessPayment: false,
    canIssuePaidTicket: false,
  };
}

export function attemptPaidCheckout(event, quantity = 1) {
  const summary = calculatePaidPreview(event, quantity);
  if (event.price > 0) {
    throw new Error(`${PAID_PREVIEW_NOTICE}. Paid event tickets cannot be purchased in Version 1.`);
  }
  return summary;
}
