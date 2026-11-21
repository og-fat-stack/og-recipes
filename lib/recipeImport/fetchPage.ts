import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Lädt eine Rezeptseite für den Link-Import. Der Server ruft hier eine vom
 * Nutzer eingegebene URL ab — deshalb nur http(s) auf Standard-Ports, keine
 * internen/privaten Adressen (auch nicht über Weiterleitungen), Timeout und
 * Größenlimit.
 */

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 12_000;

export class ImportFetchError extends Error {}

/** Exportiert für Tests. */
export function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (v === 6) {
    const s = ip.toLowerCase();
    if (s === "::" || s === "::1") return true;
    const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return /^(fc|fd|fe[89ab]|ff)/.test(s);
  }
  return true;
}

export function parseImportUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new ImportFetchError("Das ist kein gültiger Link.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ImportFetchError("Nur http- und https-Links werden unterstützt.");
  }
  if (url.username || url.password) {
    throw new ImportFetchError("Links mit Zugangsdaten werden nicht unterstützt.");
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new ImportFetchError("Links mit ungewöhnlichem Port werden nicht unterstützt.");
  }
  url.hash = "";
  return url;
}

async function assertPublicHost(url: URL): Promise<void> {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new ImportFetchError("Interne Adressen sind nicht erlaubt.");
  }
  const addresses = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true }).catch(() => {
        throw new ImportFetchError(`Die Seite ${host} wurde nicht gefunden.`);
      });
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new ImportFetchError("Interne Adressen sind nicht erlaubt.");
  }
}

async function readLimited(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new ImportFetchError("Die Seite ist zu groß.");
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}

/** Liefert HTML und die endgültige URL (nach Weiterleitungen). */
export async function fetchRecipePage(raw: string): Promise<{ html: string; url: string }> {
  let url = parseImportUrl(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url);
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "user-agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
          accept: "text/html,application/xhtml+xml",
          "accept-language": "de-DE,de;q=0.9,en;q=0.6",
        },
      });
    } catch {
      throw new ImportFetchError("Die Seite konnte nicht geladen werden (Zeitüberschreitung oder Netzwerkfehler).");
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new ImportFetchError("Fehlerhafte Weiterleitung.");
      url = parseImportUrl(new URL(location, url).toString());
      continue;
    }
    if (!res.ok) {
      throw new ImportFetchError(
        res.status === 403 || res.status === 429
          ? "Die Seite blockiert den automatischen Abruf."
          : `Die Seite antwortet mit Fehler ${res.status}.`,
      );
    }
    const type = res.headers.get("content-type") ?? "";
    if (type && !/html|xml/i.test(type)) {
      throw new ImportFetchError("Der Link zeigt nicht auf eine Webseite.");
    }
    return { html: await readLimited(res), url: url.toString() };
  }
  throw new ImportFetchError("Zu viele Weiterleitungen.");
}
