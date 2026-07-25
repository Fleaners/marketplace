export interface GSTCalculationResult {
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxValue: number;
  total: number;
  isGstCompliant: boolean;
}

export function calculateGST(params: {
  price: number;
  quantity: number;
  gstApplicable: boolean;
  gstSlab: number;
  stateType: 'intra' | 'inter';
  buyerGSTIN?: string;
}): GSTCalculationResult {
  const subtotal = params.price * params.quantity;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  const slabPercent = params.gstApplicable ? params.gstSlab : 0;
  const taxValue = subtotal * (slabPercent / 100);

  if (params.gstApplicable) {
    if (params.stateType === 'intra') {
      cgst = taxValue / 2;
      sgst = taxValue / 2;
    } else {
      igst = taxValue;
    }
  }

  const total = subtotal + taxValue;
  const isGstCompliant = params.gstApplicable && !!params.buyerGSTIN && params.buyerGSTIN.length >= 15;

  return {
    subtotal,
    cgst,
    sgst,
    igst,
    taxValue,
    total,
    isGstCompliant,
  };
}
