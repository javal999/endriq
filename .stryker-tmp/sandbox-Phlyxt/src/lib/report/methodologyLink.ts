/** Map a finding to the closest Learn anchor (heuristic). */
// @ts-nocheck

export function methodologyHrefForFinding(title: string, body: string): string {
  const t = `${title}\n${body}`.toLowerCase();

  if (
    /\bacwr\b|acute\s*(load|stress)|chronic\s*(load|stress)|load\s*ratio/i.test(
      t,
    )
  ) {
    return "/learn#training-load-acwr";
  }

  if (
    /\binterference|hours?\s+before|\bstrength\b.*\b(interval|run)\b|\blifting\b.*\b(interval|run)\b|quality\s+run|acute\s+window/i.test(
      t,
    )
  ) {
    return "/learn#concurrent-training";
  }

  if (
    /\b(programming|template|running economy|plyometric|injury prevention)\b/i.test(
      t,
    )
  ) {
    return "/learn#strength-for-runners";
  }

  if (
    /\bintensity|polar|zone\s*[12]|easy\s*(run|day)|moderate|percent\b.*easy/i.test(
      t,
    )
  ) {
    return "/learn#intensity-distribution";
  }

  if (/\bzone\b|max\s*hr|heart\s*rate|observed\s*max/i.test(t)) {
    return "/learn#heart-rate-zones";
  }

  if (/\bstrength|lifting|gym\b|weights?\b|concurrent/i.test(t)) {
    return "/learn#concurrent-training";
  }

  return "/learn#methodology";
}
