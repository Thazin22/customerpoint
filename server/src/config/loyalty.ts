export const loyaltyConfig = {
  earnAmountPerPoint: 1000,
  redemptionValuePerPoint: 10
};

export function calculateEarnedPoints(purchaseAmount: number) {
  return Math.floor(purchaseAmount / loyaltyConfig.earnAmountPerPoint);
}

export function calculateRedemptionValue(points: number) {
  return points * loyaltyConfig.redemptionValuePerPoint;
}

