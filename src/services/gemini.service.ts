// src/services/gemini.service.ts
// Calls Google Gemini 2.5 Flash API to generate raw SVG logos and complete small-business HTML websites.

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const SYSTEM_PROMPT = `Design and build a complete small-business website based on the user's submitted form data.

The website is for a local service business or sole trader in the USA. It must look professional, trustworthy, modern, mobile-friendly, and conversion-focused. The site should feel like a real business website that could go live with minor edits.

IMPORTANT
Use the form data as the source of truth for the content, tone, branding, service areas, trust signals, and calls to action. Do not generate generic filler if specific user data is available. If some fields are missing, infer carefully from the business type without making unrealistic claims.

GOAL
Generate a complete website design and implementation based on the form data. The output should be a polished business website with strong local SEO structure, clear contact paths, and a visible service area section with map support.

WEBSITE REQUIREMENTS
Build a multi-section website with the following sections where relevant:

1. TOP ANNOUNCEMENT & HEADER
- Include a promo banner if seasonal offers exist.
- Clean header with Business Logo/Name (left) and Navigation/Primary CTA (right).
- Must be fully responsive (use flexbox and media queries under 768px).

2. HERO SECTION
- Business name prominently displayed with a strong, local-SEO focused headline.
- Supporting copy focused on trust and outcome.
- Primary CTA button.
- If uploaded photo URLs are provided, use the FIRST photo URL as the Hero background or primary image.

3. ABOUT, SERVICES & TRUST SECTIONS
- Present roots, quality commitment, and main services.
- Use concise, punchy cards or bullet points. Avoid long walls of text.
- If pricing exists, render clean, modern pricing tiers or tables.
- Highlight differentiators, insurance, and qualifications using scannable feature boxes.

4. SERVICE AREA & GOOGLE MAP
- Show the main town/city and full service area.
- CRITICAL MAP RULE: Use this exact iframe format (no API key needed):
  <iframe src="https://maps.google.com/maps?q=ENCODED_LOCATION&t=&z=13&ie=UTF8&iwloc=&output=embed" width="100%" height="380" frameborder="0" style="border:0; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08);" allowfullscreen="" loading="lazy"></iframe>
  Replace ENCODED_LOCATION with the URL-encoded business address or city. Never generate an empty placeholder.

5. PORTFOLIO GALLERY (CRITICAL IMAGE RULES)
- CONSISTENCY: ONLY use the specific image URLs provided in the data. Do NOT inject random stock photos, placeholders, or unrelated images to fill space. 
- NO EMPTY GAPS: The gallery grid must be perfectly balanced. If using a 3-column layout, use a multiple of 3 (e.g., 3, 6, 9 images). If the user provides 4 images, just use 3 so the row is full. Never leave empty grid spaces.
- FRAMING: Ensure all image containers have identical dimensions (e.g., aspect-ratio: 4/3) with object-fit: cover and object-position: center.

6. FAQ & CONTACT
- Clean toggle cards for FAQs.
- High-converting quote/contact form.
- Floating mobile action bar (Call Now / WhatsApp) for viewports under 768px.

COPYWRITING & AESTHETICS — ELEGANT & PUNCHY
- Write elegant, modern copy. Avoid clunky, outdated template phrases like "Take a look at our recent projects, equipment, and professional standards." Instead, use sharp, confident headings (e.g., "Our Recent Work").
- Ensure perfect grammar, spelling, and localized SEO intent.
- Use vibrant colors, subtle glassmorphism, elegant spacing (padding: 5rem 1.5rem), and high-quality Google Fonts (e.g., Inter, Outfit).

OUTPUT FORMAT
Return ONLY raw HTML. No markdown, no code fences, no explanation text.
Start with <!DOCTYPE html> and end with </html>.
Include <meta name="viewport" content="width=device-width, initial-scale=1.0">.
Embed all CSS inside <style> in the <head>. Use Google Fonts via <link>.
Embed any JavaScript in <script> tags at the bottom.`;

export async function generateWebsiteWithGemini(naturalLanguageBrief: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }

  const url = `${GEMINI_API_URL}?key=${apiKey}`;

  const requestBody = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Here is the form data for the business website you need to build:\n\n${naturalLanguageBrief}\n\n=== CRITICAL REMINDERS BEFORE YOU GENERATE ===\n\n1. CONCISE & HIGH-CONVERTING COPY (NO REPETITION): Do not write long, repetitive walls of text or bloated paragraphs. Small box bullet copy ('<ul>' inside styled cards) is far superior to long paragraphs of text. Make every section crisp, scannable, and distinct.\n\n2. SERVICES SECTION — PUNCHY INTRO & CARDS: Write a brief, powerful 2-3 sentence introduction selling their workmanship and customer care, followed immediately by clean, structured service cards with bulleted benefits.\n\n3. WHY CHOOSE US & ABOUT — CLEAN HIGHLIGHTS: Present trust signals, qualifications, insurance, and company roots using punchy highlight cards or icons rather than long essays.\n\n4. PHOTO FRAMING & GRID BALANCING (CRITICAL):\n- IDENTICAL BOX SIZES & 100% OCCUPANCY: Frame all photos so they occupy 100% of the space inside identical-sized boxes ('aspect-ratio: 4/3; width: 100%; border-radius: 12px; overflow: hidden; position: relative; display: block;'). The image inside ('<img>') MUST occupy 100% of the box using 'width: 100%; height: 100%; object-fit: cover; object-position: center center; display: block;'. Do not leave large white gaps or empty space!\n- CENTER FOCUS CROPPING: 'object-fit: cover' with 'object-position: center center' crops naturally around the focus point so the subject stays right in the middle with background evenly distributed around the sides.\n- BALANCED GRID COUNTS (NO EMPTY HOLES): Do not leave large empty grid spaces on the page. If your gallery grid holds 3 items per row, display an exact number of photos that fills full rows cleanly (for example, exactly 3 or 6 photos—if 5 photos are available for a 3-column grid, use 3 photos so no hole is left).\n\n5. VISUAL DESIGN & TYPO CHECK: Make the website visually STUNNING with modern gradients, glassmorphism cards, Google Fonts, and smooth hover animations. Carefully verify every word to fix all typos and ensure flawless English.\n\nNow generate the complete HTML website. Return ONLY the raw HTML starting with <!DOCTYPE html>.`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 65536,
      responseMimeType: 'text/plain',
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout for Gemini full generation

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    } as any);

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const result: any = await response.json();
    const rawText: string = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!rawText) {
      throw new Error('Gemini returned an empty response');
    }

    const cleaned = rawText
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    return cleaned;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function generateLogoWithGemini(businessName: string, occupation: string, prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: "You are an expert, award-winning logo designer. Your ONLY job is to output a beautifully aesthetic, modern, and highly premium raw SVG code. Do not output anything other than the exact SVG code starting with <svg> and ending with </svg>." }] },
        contents: [{ role: 'user', parts: [{ text: `Generate a stunning, modern vector logo for Business: "${businessName || 'My Business'}", Industry: "${occupation || 'Services'}". Prompt: "${prompt}". Ensure it has a transparent background, cohesive brand colors, perfectly scaled proportions (use viewBox), and crisp, professional vector shapes.` }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 8192, responseMimeType: 'text/plain' },
      }),
    } as any);

    if (response.ok) {
      const result: any = await response.json();
      const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const svgMatch = rawText.match(/(<svg[^>]*>[\s\S]*<\/svg>)/i);
      if (svgMatch) {
        const cleanedSvg = svgMatch[1].trim();
        const base64Svg = Buffer.from(cleanedSvg).toString('base64');
        return `data:image/svg+xml;base64,${base64Svg}`;
      }
    }
  } catch (err) {
    console.error('[PROSERVICE-BE] Logo generation error:', err);
  }
  return null;
}
