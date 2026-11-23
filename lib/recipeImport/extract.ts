import { parseAggregateRating, type Rating } from "./rating";

/**
 * Liest ein schema.org-`Recipe` aus dem JSON-LD einer Rezeptseite. Fast alle
 * großen Rezeptseiten (Chefkoch, Lecker, EatSmarter, BBC Good Food, …) liefern
 * es für Suchmaschinen mit. Reine Funktionen, ohne Netzwerkzugriff.
 */

export type ExtractedRecipe = {
  name: string;
  description?: string;
  yield?: string;
  cuisine?: string;
  category?: string;
  totalTime?: string;
  ingredients: string[];
  instructions: string[];
  /** Nährwertangaben der Seite, falls vorhanden (nur als Info für Claude). */
  nutrition?: Record<string, string>;
  /** Bewertung auf der Seite (aggregateRating), falls vorhanden. */
  rating?: Rating;
};

type Json = unknown;

function isObject(v: Json): v is Record<string, Json> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function hasType(v: Record<string, Json>, type: string): boolean {
  const t = v["@type"];
  if (typeof t === "string") return t === type || t.endsWith(`/${type}`);
  if (Array.isArray(t)) return t.some((x) => typeof x === "string" && (x === type || x.endsWith(`/${type}`)));
  return false;
}

/** Sucht rekursiv (Arrays, @graph, mainEntity, …) nach dem ersten Recipe. */
export function findRecipeNode(v: Json, depth = 0): Record<string, Json> | null {
  if (depth > 8) return null;
  if (Array.isArray(v)) {
    for (const x of v) {
      const r = findRecipeNode(x, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (!isObject(v)) return null;
  if (hasType(v, "Recipe")) return v;
  for (const key of ["@graph", "mainEntity", "mainEntityOfPage", "itemListElement", "item"]) {
    if (key in v) {
      const r = findRecipeNode(v[key], depth + 1);
      if (r) return r;
    }
  }
  return null;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  auml: "ä",
  ouml: "ö",
  uuml: "ü",
  Auml: "Ä",
  Ouml: "Ö",
  Uuml: "Ü",
  szlig: "ß",
  deg: "°",
  shy: "",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code] ?? m;
  });
}

/** HTML-Tags entfernen, Entities auflösen, Leerraum glätten. */
function clean(s: string): string {
  return decodeEntities(s.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/[\u00ad\u200b]/g, "") // weiche Trennstriche, Nullbreiten-Leerzeichen
    .replace(/\s+/g, " ")
    .trim();
}

function text(v: Json): string | undefined {
  if (typeof v === "string") return clean(v) || undefined;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) {
    const parts = v.map(text).filter(Boolean);
    return parts.length ? parts.join(", ") : undefined;
  }
  if (isObject(v)) return text(v.name ?? v.text ?? v["@value"]);
  return undefined;
}

/** recipeInstructions: String, HowToStep[], HowToSection[] (verschachtelt). */
export function flattenInstructions(v: Json, depth = 0): string[] {
  if (depth > 6 || v == null) return [];
  if (typeof v === "string") {
    // Manche Seiten liefern alles in einem String — an Zeilenumbrüchen teilen.
    return v
      .split(/\r?\n+|<br\s*\/?>|<\/p>|<\/li>/i)
      .map(clean)
      .filter((s) => s.length > 1);
  }
  if (Array.isArray(v)) return v.flatMap((x) => flattenInstructions(x, depth + 1));
  if (isObject(v)) {
    if (hasType(v, "HowToSection") || "itemListElement" in v) {
      const title = text(v.name);
      const steps = flattenInstructions(v.itemListElement, depth + 1);
      return title && steps.length ? [`${title}:`, ...steps] : steps;
    }
    const t = text(v.text) ?? text(v.name) ?? text(v.description);
    return t ? [t] : [];
  }
  return [];
}

export function parseRecipeNode(node: Record<string, Json>): ExtractedRecipe | null {
  const name = text(node.name);
  const rawIngredients = node.recipeIngredient ?? node.ingredients;
  const ingredients = (Array.isArray(rawIngredients) ? rawIngredients : [rawIngredients])
    .map(text)
    .filter((s): s is string => !!s);
  const instructions = flattenInstructions(node.recipeInstructions);
  if (!name || ingredients.length === 0) return null;

  let nutrition: Record<string, string> | undefined;
  if (isObject(node.nutrition)) {
    nutrition = {};
    for (const [k, v] of Object.entries(node.nutrition)) {
      if (k.startsWith("@")) continue;
      const t = text(v);
      if (t) nutrition[k] = t;
    }
    if (Object.keys(nutrition).length === 0) nutrition = undefined;
  }

  return {
    name,
    description: text(node.description)?.slice(0, 600),
    yield: text(node.recipeYield),
    cuisine: text(node.recipeCuisine),
    category: text(node.recipeCategory),
    totalTime: text(node.totalTime),
    ingredients: ingredients.slice(0, 80),
    instructions: instructions.slice(0, 60).map((s) => s.slice(0, 1500)),
    nutrition,
    rating: parseAggregateRating(node.aggregateRating) ?? undefined,
  };
}

/** Alle JSON-LD-Blöcke einer HTML-Seite parsen und das Rezept herausziehen. */
export function extractRecipeFromHtml(html: string): ExtractedRecipe | null {
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    const raw = m[1]
      .trim()
      .replace(/^<!--/, "")
      .replace(/-->$/, "")
      .replace(/^\/\/\s*<!\[CDATA\[/, "")
      .replace(/\/\/\s*\]\]>$/, "")
      .trim();
    let data: Json;
    try {
      data = JSON.parse(raw);
    } catch {
      // Manche Seiten haben rohe Zeilenumbrüche in Strings — einmal glätten.
      try {
        data = JSON.parse(raw.replace(/[\r\n\t]+/g, " "));
      } catch {
        continue;
      }
    }
    const node = findRecipeNode(data);
    const recipe = node ? parseRecipeNode(node) : null;
    if (recipe) return recipe;
  }
  return null;
}
