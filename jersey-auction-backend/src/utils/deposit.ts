const parsePositiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const DEPOSIT_REQUEST_MINIMUM = parsePositiveNumber(process.env.DEPOSIT_REQUEST_MINIMUM, 50000);
export const BID_DEPOSIT_REQUIRED = parsePositiveNumber(process.env.BID_DEPOSIT_REQUIRED, 1000000);
export const DEPOSIT_REFUND_RATE = Math.min(parsePositiveNumber(process.env.DEPOSIT_REFUND_RATE, 0.7), 1);
export const DEPOSIT_FORFEIT_RATE = Number(Math.max(0, 1 - DEPOSIT_REFUND_RATE).toFixed(4));

export function calculateBidDepositRequirement(_bidAmount: number) {
  return BID_DEPOSIT_REQUIRED;
}

export function getDepositPolicy() {
  return {
    bidDepositRate: 0,
    bidDepositMinimum: BID_DEPOSIT_REQUIRED,
    bidDepositRequired: BID_DEPOSIT_REQUIRED,
    depositRefundRate: DEPOSIT_REFUND_RATE,
    depositForfeitRate: DEPOSIT_FORFEIT_RATE,
    depositRequestMinimum: DEPOSIT_REQUEST_MINIMUM
  };
}
