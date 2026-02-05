// Anthropic model pricing — USD per 1 M tokens.
// Source: https://www.anthropic.com/pricing
// ⚠️  Update the numbers below when Anthropic changes pricing.
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
};

const FALLBACK = { input: 3.0, output: 15.0 };

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  const p = PRICING[model] || FALLBACK;
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

export function formatCost(usd: number): string {
  return usd < 0.005 ? "<$0.01" : `$${usd.toFixed(2)}`;
}

export function formatTokens(n: number): string {
  return n.toLocaleString("en-US");
}
