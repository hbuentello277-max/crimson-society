/** Lightweight helpers for the fixed NEXUS cron schedules in vercel.json. */

export function cronIntervalMinutes(schedule: string): number {
  if (schedule.startsWith("*/")) {
    const step = Number.parseInt(schedule.split(" ")[0]?.slice(2) ?? "", 10);
    return Number.isFinite(step) && step > 0 ? step : 60;
  }

  const minuteField = schedule.split(" ")[0] ?? "";
  if (minuteField.includes("/")) {
    const step = Number.parseInt(minuteField.split("/")[1] ?? "", 10);
    return Number.isFinite(step) && step > 0 ? step : 60;
  }

  return 60;
}

export function computeNextCronRunIso(schedule: string, from = new Date()): string {
  const minuteField = schedule.split(" ")[0] ?? "*";
  const base = new Date(from.getTime());
  base.setUTCSeconds(0, 0);

  if (minuteField === "*" || minuteField === "0") {
    const next = new Date(base.getTime() + 60_000);
    next.setUTCMinutes(minuteField === "0" ? next.getUTCMinutes() : next.getUTCMinutes() + 1, 0, 0);
    if (minuteField === "0") {
      next.setUTCMinutes(0, 0, 0);
      if (next.getTime() <= base.getTime()) {
        next.setUTCHours(next.getUTCHours() + 1);
      }
    }
    return next.toISOString();
  }

  if (minuteField.startsWith("*/")) {
    const step = Number.parseInt(minuteField.slice(2), 10);
    const currentMinute = base.getUTCMinutes();
    const remainder = currentMinute % step;
    const add = remainder === 0 && base.getUTCSeconds() === 0 ? step : step - remainder;
    const next = new Date(base.getTime());
    next.setUTCMinutes(currentMinute + add, 0, 0);
    return next.toISOString();
  }

  if (minuteField.includes("/")) {
    const [range, stepRaw] = minuteField.split("/");
    const step = Number.parseInt(stepRaw ?? "5", 10);
    const start = Number.parseInt(range.split("-")[0] ?? "0", 10);
    const currentMinute = base.getUTCMinutes();
    let candidate = currentMinute;
    if (candidate < start) {
      candidate = start;
    } else {
      const offset = candidate - start;
      const remainder = offset % step;
      candidate = remainder === 0 && base.getUTCSeconds() === 0 ? candidate + step : candidate + (step - remainder);
    }
    const next = new Date(base.getTime());
    next.setUTCMinutes(candidate, 0, 0);
    if (next.getTime() <= base.getTime()) {
      next.setUTCMinutes(candidate + step, 0, 0);
    }
    return next.toISOString();
  }

  const fixedMinute = Number.parseInt(minuteField, 10);
  const next = new Date(base.getTime());
  next.setUTCMinutes(fixedMinute, 0, 0);
  if (next.getTime() <= base.getTime()) {
    next.setUTCHours(next.getUTCHours() + 1);
  }
  return next.toISOString();
}

export function isCronRunOverdue(
  lastRunAt: string | null,
  schedule: string,
  now = new Date(),
): boolean {
  if (!lastRunAt) {
    return true;
  }

  const last = new Date(lastRunAt).getTime();
  if (Number.isNaN(last)) {
    return true;
  }

  const intervalMs = cronIntervalMinutes(schedule) * 60_000;
  const graceMs = Math.max(intervalMs * 0.5, 5 * 60_000);
  return now.getTime() - last > intervalMs + graceMs;
}
