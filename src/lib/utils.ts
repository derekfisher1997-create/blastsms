export function parseCSV(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const numbers: string[] = [];
  for (const line of lines) {
    const cols = line.split(",");
    const val = cols[0]?.trim().replace(/^["']|["']$/g, "");
    if (val && /^\+?[\d\s()\-]{7,}$/.test(val)) {
      numbers.push(val);
    }
  }
  return numbers;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export function pct(a: number, b: number): string {
  if (b === 0) return "0";
  return ((a / b) * 100).toFixed(1);
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function isValidPhone(value: string): boolean {
  return /^\+?[\d\s()\-]{7,}$/.test(value.trim());
}

export function animateValue(
  start: number,
  end: number,
  duration: number,
  callback: (value: number) => void
) {
  const startTime = performance.now();
  function update(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    callback(start + (end - start) * eased);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}
