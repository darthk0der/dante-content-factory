// Fetches condition.html template from GitHub and populates CMS fields
const GITHUB_BASE = 'https://api.github.com';
const OWNER = process.env.GITHUB_REPO_OWNER || 'dante-labs';
const REPO = process.env.GITHUB_REPO_NAME || 'dante-labs-website';

async function fetchTemplate() {
  const url = `${GITHUB_BASE}/repos/${OWNER}/${REPO}/contents/public/condition.html`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3.raw',
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch condition.html template: ${res.status}`);
  return res.text();
}

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Populate the condition.html template with the CMS fields from the content item.
 * Follows the substitution map from the V2 brief exactly.
 */
export async function buildConditionPage(item) {
  const c = item.content; // CMS fields object
  let html = await fetchTemplate();

  // ── SEO / head substitutions ──────────────────────────────────────────────
  html = replaceAttr(html, 'title', null, c.seo_title + ' | Dante Labs', 'inner');
  html = replaceAttr(html, 'meta[name="description"]', 'content', c.seo_description);
  html = replaceAttr(html, 'link[rel="canonical"]', 'href', c.canonical_url);
  html = replaceAttr(html, 'meta[property="og:url"]', 'content', c.og_url);
  html = replaceAttr(html, 'meta[property="og:title"]', 'content', c.seo_title);
  html = replaceAttr(html, 'meta[property="og:description"]', 'content', c.seo_description);
  html = replaceAttr(html, 'meta[name="twitter:title"]', 'content', c.seo_title);
  html = replaceAttr(html, 'meta[name="twitter:description"]', 'content', c.seo_description);

  // ── JSON-LD schema ────────────────────────────────────────────────────────
  html = replaceJsonLd(html, c);

  // ── Hero section ──────────────────────────────────────────────────────────
  // condition_category eyebrow: replace "ABOUT BRCA1 AND BRCA2" with condition name
  html = html.replace(
    /ABOUT BRCA1 AND BRCA2/gi,
    `ABOUT ${(c.condition_name || '').toUpperCase()}`
  );
  html = replaceCmsField(html, 'condition_category', `${c.condition_category} · WHOLE GENOME SEQUENCING`);
  html = replaceCmsField(html, 'hero_headline', c.hero_headline);
  html = replaceCmsField(html, 'hero_subhead', c.hero_subhead);

  // ── Breadcrumb ────────────────────────────────────────────────────────────
  html = replaceAll(html, /href="\/conditions\/[^"]*"/g, `href="/conditions/${c.condition_slug}/"`);

  // ── About section ─────────────────────────────────────────────────────────
  html = replaceCmsField(html, 'about_h2', c.about_h2);
  html = replaceAboutBody(html, c);

  // Subtype callout
  if (c.about_subtype_callout) {
    html = replaceCmsField(html, 'about_subtype_callout', c.about_subtype_callout);
  } else {
    // Hide the div entirely
    html = html.replace(/<div[^>]*class="[^"]*cond-subtype-callout[^"]*"[^>]*>[\s\S]*?<\/div>/i, '');
  }

  // ── Why WGS section ───────────────────────────────────────────────────────
  html = replaceCmsField(html, 'why_wgs_h2', c.why_wgs_h2);
  html = replaceCmsField(html, 'why_wgs_card_1_headline', c.why_wgs_card_1_headline);
  html = replaceCmsField(html, 'why_wgs_card_1_body', c.why_wgs_card_1_body);
  html = replaceCmsField(html, 'why_wgs_card_2_headline', c.why_wgs_card_2_headline);
  html = replaceCmsField(html, 'why_wgs_card_2_body', c.why_wgs_card_2_body);

  // ── PAG section — condition name ──────────────────────────────────────────
  html = replaceCmsField(html, 'condition_name', c.condition_name);

  // ── Breadcrumb labels ─────────────────────────────────────────────────────
  html = html
    .replace(/data-cms-field="category_anchor"[^>]*>[^<]*/g, `data-cms-field="category_anchor">${escHtml(c.category_anchor)}`)
    .replace(/data-cms-field="category_label"[^>]*>[^<]*/g, `data-cms-field="category_label">${escHtml(c.category_label)}`);

  // Image — replace any BRCA hero image src with the generated image if available
  if (item.image_url) {
    html = html.replace(/<img([^>]*class="[^"]*cond-hero[^"]*"[^>]*)src="[^"]*"/g,
      `<img$1src="${item.image_url}"`);
  }

  return html;
}

// ── DOM-like regex helpers ────────────────────────────────────────────────────

function replaceCmsField(html, field, value) {
  if (!value) return html;
  // Match data-cms-field="field" and replace inner content up to </
  return html.replace(
    new RegExp(`(data-cms-field="${field}"[^>]*>)[\\s\\S]*?(<\/)`, 'm'),
    `$1${escHtml(value)}$2`
  );
}

function replaceAttr(html, selector, attr, value, mode) {
  if (!value) return html;
  if (mode === 'inner') {
    // Replace inner text of <title>
    return html.replace(/<title>[^<]*<\/title>/i, `<title>${escHtml(value)}</title>`);
  }
  // Replace attribute value for a specific tag/attr combo
  const tagMatch = selector.match(/^(\w+)/);
  if (!tagMatch) return html;
  const tag = tagMatch[1];
  const attrStr = selector.includes('[') ? selector.match(/\[([^\]]+)\]/)?.[1] : null;

  if (attrStr) {
    const [filterAttr, filterVal] = attrStr.replace(/"/g, '').split('=');
    const regex = new RegExp(
      `(<${tag}[^>]*${filterAttr}="${filterVal}"[^>]*${attr}=")[^"]*(")`
    );
    if (regex.test(html)) return html.replace(regex, `$1${escHtml(value)}$2`);
    // Try reversed attribute order
    const regex2 = new RegExp(
      `(<${tag}[^>]*${attr}=")[^"]*("[^>]*${filterAttr}="${filterVal}")`
    );
    return html.replace(regex2, `$1${escHtml(value)}$2`);
  }
  return html.replace(
    new RegExp(`(<${tag}[^>]*${attr}=")[^"]*(")`, 'i'),
    `$1${escHtml(value)}$2`
  );
}

function replaceAboutBody(html, c) {
  // Build the 2 or 3 paragraphs
  const p3 = c.about_body_p3
    ? `<p>${escHtml(c.about_body_p3)}</p>`
    : '';
  const bodyHtml = `<p>${escHtml(c.about_body_p1)}</p><p>${escHtml(c.about_body_p2)}</p>${p3}`;
  return html.replace(
    /(data-cms-field="about_body"[^>]*>)[\s\S]*?(<\/)/m,
    `$1${bodyHtml}$2`
  );
}

function replaceJsonLd(html, c) {
  return html.replace(
    /(<script[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/i,
    (match, open, jsonStr, close) => {
      try {
        const schema = JSON.parse(jsonStr);
        if (c.condition_name) schema.name = c.condition_name;
        if (c.schema_alternate_names) schema.alternateName = c.schema_alternate_names;
        if (c.schema_description) schema.description = c.schema_description;
        if (c.schema_anatomy && schema.associatedAnatomy) {
          schema.associatedAnatomy.name = c.schema_anatomy;
        }
        if (c.schema_treatment && schema.possibleTreatment) {
          schema.possibleTreatment.name = c.schema_treatment;
        }
        return `${open}${JSON.stringify(schema, null, 2)}${close}`;
      } catch {
        return match; // leave unchanged if schema parse fails
      }
    }
  );
}

function replaceAll(html, regex, replacement) {
  return html.replace(regex, replacement);
}
