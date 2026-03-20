/**
 * Netlify Function: fetch-recipe
 * Fetches a recipe page server-side and extracts structured instructions
 * from JSON-LD (schema.org/Recipe) data embedded in the HTML.
 *
 * Returns:
 *   { found: bool, instructions: string[], ingredients: string[], cookTime: string, debug: string }
 */

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const url = event.queryStringParameters?.url;
  if (!url) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ found: false, debug: 'Missing url param' }) };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Bad protocol');
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ found: false, debug: 'Invalid URL' }) };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    // Use realistic mobile Safari headers to avoid bot detection
    const res = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ found: false, debug: `Site returned HTTP ${res.status} — may block automated requests` }),
      };
    }

    const html = await res.text();
    const result = extractRecipeFromHtml(html);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        ...result,
        debug: result.found
          ? `Real instructions found (${result.instructions.length} steps from ${parsedUrl.hostname})`
          : `No JSON-LD schema found on page (${html.length} bytes from ${parsedUrl.hostname})`,
      }),
    };

  } catch (err) {
    const msg = err.name === 'AbortError' ? 'Request timed out (10s)' : (err.message || 'Fetch failed');
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ found: false, debug: msg }),
    };
  }
};

function extractRecipeFromHtml(html) {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const raw = match[1].trim();
      const data = JSON.parse(raw);
      const candidates = Array.isArray(data) ? data : [data];

      for (const item of candidates) {
        const recipe = findRecipeNode(item);
        if (recipe) {
          const instructions = extractInstructions(recipe.recipeInstructions);
          const ingredients = extractIngredients(recipe.recipeIngredient);
          const cookTime = parseDuration(recipe.totalTime || recipe.cookTime);
          if (instructions.length > 0) {
            return { found: true, instructions, ingredients, cookTime };
          }
        }
      }
    } catch {
      // Malformed JSON block — skip
    }
  }

  return { found: false };
}

function findRecipeNode(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const type = obj['@type'];
  if (type === 'Recipe') return obj;
  if (Array.isArray(type) && type.includes('Recipe')) return obj;

  // Check @graph (common on WordPress/Yoast sites)
  if (Array.isArray(obj['@graph'])) {
    for (const node of obj['@graph']) {
      const found = findRecipeNode(node);
      if (found) return found;
    }
  }

  return null;
}

function extractInstructions(raw) {
  if (!raw) return [];
  if (typeof raw === 'string') {
    return raw.split(/\n+/).map(s => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(raw)) return [];

  const steps = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      steps.push(item.trim());
    } else if (item && typeof item === 'object') {
      if (item['@type'] === 'HowToSection' && Array.isArray(item.itemListElement)) {
        for (const sub of item.itemListElement) {
          const text = sub.text || sub.name || '';
          if (text.trim()) steps.push(text.trim());
        }
      } else {
        const text = item.text || item.name || '';
        if (text.trim()) steps.push(text.trim());
      }
    }
  }
  return steps.filter(Boolean);
}

function extractIngredients(raw) {
  if (!raw) return [];
  if (typeof raw === 'string') return [raw];
  if (Array.isArray(raw)) return raw.map(i => (typeof i === 'string' ? i : i.text || '')).filter(Boolean);
  return [];
}

function parseDuration(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return iso;
  const hours = parseInt(match[1] || '0');
  const mins = parseInt(match[2] || '0');
  const total = hours * 60 + mins;
  if (total === 0) return null;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${total} min`;
}
