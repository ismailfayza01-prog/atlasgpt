export function generateTrackingCode(prefix = "APE") {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let tail = "";
  for (let i = 0; i < 10; i++) tail += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${tail}`;
}
