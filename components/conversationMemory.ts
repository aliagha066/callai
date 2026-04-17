export type MemoryFact = {
  key: string;
  value: string;
  /** ISO timestamp when last confirmed/updated */
  updatedAt: string;
  /** Where it came from (debuggable, not shown to user) */
  source: "user_message";
};

const MAX_FACTS = 20;

function normalizeKey(k: string) {
  return k.trim().toLowerCase();
}

function cleanValue(v: string) {
  return v.trim().replace(/\s+/g, " ").slice(0, 120);
}

function storageKeyForUser(userId: string | null) {
  return `callai.memory.facts.v1.${userId ?? "guest"}`;
}

export function loadMemoryFacts(userId: string | null): MemoryFact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKeyForUser(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const facts: MemoryFact[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const it = item as Partial<MemoryFact>;
      if (!it.key || !it.value || !it.updatedAt) continue;
      facts.push({
        key: normalizeKey(String(it.key)),
        value: cleanValue(String(it.value)),
        updatedAt: String(it.updatedAt),
        source: "user_message",
      });
    }
    return facts.slice(0, MAX_FACTS);
  } catch {
    return [];
  }
}

export function saveMemoryFacts(userId: string | null, facts: MemoryFact[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKeyForUser(userId),
      JSON.stringify(facts.slice(0, MAX_FACTS)),
    );
  } catch {
    // ignore storage failures
  }
}

/**
 * Extract a few safe, non-sensitive "facts" from the user's message.
 * We intentionally avoid location, health, finance, credentials, etc.
 */
export function extractMemoryFactsFromUserText(text: string): MemoryFact[] {
  const t = text.trim();
  if (!t) return [];

  const now = new Date().toISOString();
  const out: MemoryFact[] = [];

  // Name preference.
  // Examples: "my name is Ali", "call me Ali", "you can call me Ali"
  const nameMatch =
    t.match(/\b(?:my name is|call me|you can call me)\s+([^\n,.!?]{2,40})/i) ??
    null;
  if (nameMatch?.[1]) {
    const name = cleanValue(nameMatch[1]).replace(/^["'“”]+|["'“”]+$/g, "");
    if (name && name.length <= 40) {
      out.push({ key: "user_name", value: name, updatedAt: now, source: "user_message" });
    }
  }

  // Preference: "I prefer X" / "I like X" / "I don't like X"
  // Keep very short to avoid storing sensitive or overly specific info.
  const preferMatch = t.match(/\b(?:i prefer|i usually prefer)\s+([^\n.?!]{2,80})/i);
  if (preferMatch?.[1]) {
    const pref = cleanValue(preferMatch[1]);
    if (pref && pref.length <= 80) {
      out.push({
        key: "preference",
        value: pref,
        updatedAt: now,
        source: "user_message",
      });
    }
  }

  const likeMatch = t.match(/\b(?:i like|i love)\s+([^\n.?!]{2,80})/i);
  if (likeMatch?.[1]) {
    const like = cleanValue(likeMatch[1]);
    if (like && like.length <= 80) {
      out.push({ key: "likes", value: like, updatedAt: now, source: "user_message" });
    }
  }

  const dislikeMatch =
    t.match(/\b(?:i don't like|i do not like|i hate)\s+([^\n.?!]{2,80})/i) ?? null;
  if (dislikeMatch?.[1]) {
    const dislike = cleanValue(dislikeMatch[1]);
    if (dislike && dislike.length <= 80) {
      out.push({
        key: "dislikes",
        value: dislike,
        updatedAt: now,
        source: "user_message",
      });
    }
  }

  // De-dup within extraction.
  const seen = new Set<string>();
  return out.filter((f) => {
    const k = normalizeKey(f.key);
    const v = cleanValue(f.value);
    const id = `${k}:${v}`;
    if (!k || !v) return false;
    if (seen.has(id)) return false;
    seen.add(id);
    f.key = k;
    f.value = v;
    return true;
  });
}

export function mergeMemoryFacts(existing: MemoryFact[], incoming: MemoryFact[]): MemoryFact[] {
  const byKey = new Map<string, MemoryFact>();
  for (const f of existing) byKey.set(normalizeKey(f.key), f);

  for (const f of incoming) {
    const k = normalizeKey(f.key);
    const v = cleanValue(f.value);
    if (!k || !v) continue;
    const prev = byKey.get(k);
    // Replace on new value (or refresh timestamp if same).
    if (!prev || prev.value !== v) {
      byKey.set(k, { ...f, key: k, value: v });
    } else {
      byKey.set(k, { ...prev, updatedAt: f.updatedAt });
    }
  }

  // Most recent first.
  const merged = [...byKey.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return merged.slice(0, MAX_FACTS);
}

