// src/services/claude.service.ts
// Calls the Claude API (Anthropic) to generate raw SVG logos and complete small-business HTML websites.

import Anthropic from '@anthropic-ai/sdk';

const WEBSITE_MODEL = 'claude-opus-4-8';
const LOGO_MODEL = 'claude-opus-4-8';

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
  }
  return new Anthropic({ apiKey });
}

const SYSTEM_PROMPT = `Design and build a complete small-business website based on the user's submitted form data.

The website is for a local service business or sole trader in the USA. It must look professional, trustworthy, modern, mobile-friendly, and conversion-focused. The site should feel like a real business website that could go live with minor edits.

IMPORTANT
Use the form data as the source of truth for the content, tone, branding, service areas, trust signals, and calls to action. Do not generate generic filler if specific user data is available. If some fields are missing, infer carefully from the business type without making unrealistic claims.

GOAL
Generate a complete website design and implementation based on the form data. The output should be a polished business website with strong local SEO structure, clear contact paths, and a visible service area section with map support.

WEBSITE REQUIREMENTS
Build a multi-section website with the following sections where relevant:

1. TOP ANNOUNCEMENT / PROMO BANNER (If Seasonal Offers exist)
- If seasonal_offers or promotions are provided in the brief, include a top announcement bar above the header with eye-catching contrast and a CTA button.

2. TOP HEADER / NAVIGATION BAR
- Clean, professional header with Business Logo / Name on the left and Navigation Links (Services, About, Pricing, FAQ, Contact) + Primary Call-to-Action button on the right.
- CRITICAL RESPONSIVENESS RULE FOR HEADER: The header MUST be fully responsive inside any viewport or iframe. Use CSS flexbox with 'flex-wrap: wrap' and media queries ('@media (max-width: 768px)') so that on mobile/tablet viewports (under 768px), the navigation links either wrap cleanly, adjust spacing/font-size, or stack neatly without overflowing horizontally or clipping text. Never use fixed widths that break on 390px or 768px iframe screens.

3. HERO SECTION
- Business name prominently displayed
- Strong headline based on occupation, location, and top service
- Supporting copy focused on trust and outcome (expand to be persuasive and descriptive)
- Primary CTA button based on main_cta
- Secondary CTA where useful
- Show trust indicators such as years in business, insured, qualified, emergency service, etc.
- If uploaded photo URLs are provided, use the FIRST photo URL prominently as the Hero Section background banner or primary featured image.

4. ABOUT SECTION (CONCISE & IMPACTFUL)
- Present the company's roots, commitment to quality, and local dedication clearly and concisely.
- Avoid long walls of text or repetitive paragraphs. Small, structured cards or clean bullet points with punchy highlights are far better than long paragraphs.
- Keep tone aligned to selected style_preference and selected_website_look.

5. SERVICES & PRICING SECTION (PUNCHY BENEFITS & CARDS)
- Clearly present main_services and specialities, giving extra prominence to top_services_to_promote.
- Include a concise, compelling introduction (2-3 crisp sentences) selling the value of their workmanship and customer care. Do not write bloated or repetitive walls of text.
- Follow immediately with beautifully structured individual service cards or detailed breakdown tiers. Small box bullet copy ('<ul>' inside cards) is much better than long text blocks.
- If price_list exists, render clean, structured pricing tiers, package cards, or a transparent pricing table.
- Use modern card grids with subtle glassmorphism or hover elevation and clear icons.

6. WHY CHOOSE US / TRUST SECTION (PUNCHY HIGHLIGHTS)
- Present the client's differentiator, qualifications, insurance, memberships, specialist tools, guarantees, and notable work in clean, scannable feature boxes or icon-based bullet points.
- Insurance status (show a prominent "Fully Insured" badge if true).
- ALIGNMENT: If using a bulleted or checkbox list under a centered heading, use CSS 'margin: 0 auto; width: fit-content;' on the list container so the list block is perfectly centered on the page while keeping the text inside it cleanly left-aligned.

7. SERVICE AREA & INTERACTIVE GOOGLE MAP SECTION — CRITICAL
- Show the main town/city and full service area list clearly.
- Include a concise paragraph explaining their regional coverage and quick response availability.
- CRITICAL MAP RULE: To display a live, interactive Google Map without needing a paid API key, you MUST use the following free embed iframe format:
  <iframe src="https://maps.google.com/maps?q=ENCODED_LOCATION&t=&z=13&ie=UTF8&iwloc=&output=embed" width="100%" height="380" frameborder="0" style="border:0; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); width: 100%;" allowfullscreen="" loading="lazy"></iframe>
  Replace ENCODED_LOCATION with the URL-encoded business address, main city, or service area (for example: "New+York,+NY" or "Chicago,+IL" or "London,+UK").
- NEVER generate an empty placeholder div, mock comment, or "Map coming soon" text. You MUST ALWAYS generate a real, working iframe with the URL structure above!

8. TESTIMONIALS / SOCIAL PROOF & MULTIPLE PHOTO GALLERY SECTION
- If testimonials are available, display them in a strong testimonial card section with star ratings.
- MULTIPLE PHOTO GALLERY (NO EMPTY SPACES / BALANCED ROWS): If uploaded photo URLs are provided, create a dedicated "Our Work & Portfolio Gallery" section.
- CRITICAL GRID & PHOTO FRAMING RULE:
  1. IDENTICAL BOX SIZES & 100% OCCUPANCY: Every photo container box MUST have identical, uniform dimensions ('aspect-ratio: 4/3; width: 100%; border-radius: 12px; overflow: hidden; position: relative; display: block; background: #f8fafc;'). The image inside ('<img>') MUST occupy 100% of the box space using 'width: 100%; height: 100%; object-fit: cover; object-position: center center; display: block;'. Do not use 'object-fit: contain' which leaves ugly empty space!
  2. CENTER FOCUS CROPPING: 'object-fit: cover' with 'object-position: center center' crops naturally around the focus point so what is left is the focus point right in the middle with background around the sides, without distortion.
  3. BALANCED GRID COUNTS (NO EMPTY HOLES): Do NOT leave large empty grid spaces on the page. If your gallery grid has 3 columns ('grid-template-columns: repeat(3, 1fr)' or 'repeat(auto-fit, minmax(300px, 1fr))'), display an exact number of photos that completely fills full rows (for example, exactly 3 or 6 photos). If the user provided 5 photos for a 3-column grid, it is much better to just pick 3 photos so every box is full and no incomplete row or empty gap is left!

9. FAQ (FREQUENTLY ASKED QUESTIONS) SECTION — CRITICAL
- Include a dedicated FAQ section answering common customer questions for this business type (e.g., "Do you offer emergency or same-day service?", "Are you fully licensed and insured?", "How does pricing and estimating work?", "What areas do you cover?").
- Structure questions using clean toggle cards or details/summary tags so customers can find answers quickly.

10. LEAD CAPTURE / QUOTE REQUEST FORM SECTION
- Include a high-converting contact/quote form section with styled HTML input fields: Full Name, Phone Number, Email Address, Service Needed (dropdown or text), and Message/Project Details.
- Include a prominent submit button styled with the primary accent color.
- Show best phone number (<a href="tel:...">) and email (<a href="mailto:...">) alongside the form.

11. FLOATING MOBILE ACTION BAR (FOR MOBILE VIEWPORTS)
- For mobile devices (under 768px), include a fixed bottom contact bar with quick action buttons (e.g., "Call Now" and "Get a Quote" or "WhatsApp") so visitors on smartphones can contact the business immediately from any scroll position.

COPYWRITING & GRAMMAR RULES — CONCISE, PUNCHY & TYPO-FREE
- CONCISE COPY & NO REPETITION: Do not write long, bloated paragraphs of text. Small box bullet copy is far better and higher-converting than long paragraphs of text. Make every section crisp and distinct without repeating the same sentences or claims across pages.
- TYPO & GRAMMAR CHECK: Carefully check all copy, headings, phone numbers, and business names. Fix all typos, ensure perfect spelling, and maintain flawless, professional English.
- Ensure perfect punctuation, capitalization, and formatting for all headings, paragraphs, and lists.

DESIGN AND STYLE RULES — CRITICAL AESTHETICS (STUNNING & BEAUTIFUL)
- The website MUST be visually stunning and WOW the user at first glance. Make the layout look strictly state-of-the-art and high-converting.
- Implement rich, modern aesthetics: vibrant, harmonious color palettes, subtle glassmorphism cards, modern linear gradients for section headers and accent buttons, deep box-shadows ('box-shadow: 0 10px 30px rgba(0,0,0,0.08)'), and elegant generous spacing ('padding: 5rem 1.5rem').
- Use high-quality modern typography (import Google Fonts like Inter, Plus Jakarta Sans, or Outfit via <link>) with excellent font weight contrast and clear visual hierarchy.
- Include CSS micro-animations (smooth button hover glow and transform lifts, subtle card elevation on hover, and smooth fade transitions) to make the site feel dynamic and alive.
- Avoid generic, flat, blocky, or outdated "template" looks. The design must feel state-of-the-art, custom-built, and premium.
- IDENTICAL PHOTO FRAMING RULE: Frame all photos so they occupy 100% of the space inside identical-sized boxes ('aspect-ratio: 4/3; overflow: hidden; width: 100%;') using 'width: 100%; height: 100%; object-fit: cover; object-position: center center;'. Never leave large empty space or unbalanced photo grid holes!

SUPPORTED WEBSITE LOOK DIRECTIONS
1. Professional Blue - trustworthy, professional, established (trades, consultants, repair)
2. Local Green - reliable, practical, eco-friendly, local (landscapers, cleaners, handymen)
3. Warm Premium - grounded, traditional, premium, personal (boutique trades, family-run)
4. Dark Regal - high-end, serious, premium (luxury services, specialists)
5. Clean Minimal - modern, understated, clean (almost any service business)
6. Bold Strong - strong, confident, urgent (emergency trades, roofers, plumbing)

SEO AND CONTENT RULES
- Use seo_keywords and seo_locations naturally in headings, intro copy, and service area content
- Do not keyword stuff
- Make page copy locally relevant
- Use strong title, H1, H2, meta-description-ready copy patterns
- Keep local intent visible in the hero, services, and service area sections

MAP REQUIREMENTS — MANDATORY
- You MUST include the live interactive Google Map iframe using: https://maps.google.com/maps?q=ENCODED_LOCATION&t=&z=13&ie=UTF8&iwloc=&output=embed
- NEVER output empty placeholders, TODO comments, or broken map tags.

FUNCTIONAL REQUIREMENTS
- Responsive design (mobile-first)
- HEADER & NAVBAR ALIGNMENT RULE: The website header (<header> or <nav>) MUST be responsive and flexbox-aligned. On desktop and tablet viewports, the logo/brand name, the navigation anchor links, and the call-to-action button MUST ALL BE IN THE SAME HORIZONTAL ROW (display: flex; justify-content: space-between; align-items: center; flex-wrap: nowrap; gap: 1.5rem;). On mobile viewports (< 768px), use a clean hamburger toggle or vertical collapse.
- INTERACTIVITY & NAVIGATION RULE: Every major section MUST have an ID and navbar links must point to them smoothly.
- Click-to-call phone links on mobile: <a href="tel:PHONENUMBER">
- Email links: <a href="mailto:EMAIL">
- Styled HTML contact/quote form
- WhatsApp or booking CTA if requested

OUTPUT FORMAT — CRITICAL
Return ONLY raw HTML. No markdown. No code fences. No explanation text before or after.
The output must be a complete, self-contained HTML document starting with <!DOCTYPE html> and ending with </html>.
You MUST include <meta name="viewport" content="width=device-width, initial-scale=1.0"> in the <head> tag so responsive media queries work properly inside iframes and mobile viewports.
Embed all CSS inside a <style> tag in the <head>. Do not reference external CSS files.
You may use Google Fonts via a <link> tag.
All JavaScript must be embedded in <script> tags at the bottom of the body.`;

function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

export async function generateWebsiteWithClaude(naturalLanguageBrief: string): Promise<string> {
  const client = getClient();

  const userMessage = `Here is the form data for the business website you need to build:\n\n${naturalLanguageBrief}\n\n=== CRITICAL REMINDERS BEFORE YOU GENERATE ===\n\n1. CONCISE & HIGH-CONVERTING COPY (NO REPETITION): Do not write long, repetitive walls of text or bloated paragraphs. Small box bullet copy ('<ul>' inside styled cards) is far superior to long paragraphs of text. Make every section crisp, scannable, and distinct.\n\n2. SERVICES SECTION — PUNCHY INTRO & CARDS: Write a brief, powerful 2-3 sentence introduction selling their workmanship and customer care, followed immediately by clean, structured service cards with bulleted benefits.\n\n3. WHY CHOOSE US & ABOUT — CLEAN HIGHLIGHTS: Present trust signals, qualifications, insurance, and company roots using punchy highlight cards or icons rather than long essays.\n\n4. PHOTO FRAMING & GRID BALANCING (CRITICAL):\n- IDENTICAL BOX SIZES & 100% OCCUPANCY: Frame all photos so they occupy 100% of the space inside identical-sized boxes ('aspect-ratio: 4/3; width: 100%; border-radius: 12px; overflow: hidden; position: relative; display: block;'). The image inside ('<img>') MUST occupy 100% of the box using 'width: 100%; height: 100%; object-fit: cover; object-position: center center; display: block;'. Do not leave large white gaps or empty space!\n- CENTER FOCUS CROPPING: 'object-fit: cover' with 'object-position: center center' crops naturally around the focus point so the subject stays right in the middle with background evenly distributed around the sides.\n- BALANCED GRID COUNTS (NO EMPTY HOLES): Do not leave large empty grid spaces on the page. If your gallery grid holds 3 items per row, display an exact number of photos that fills full rows cleanly (for example, exactly 3 or 6 photos—if 5 photos are available for a 3-column grid, use 3 photos so no hole is left).\n\n5. VISUAL DESIGN & TYPO CHECK: Make the website visually STUNNING with modern gradients, glassmorphism cards, Google Fonts, and smooth hover animations. Carefully verify every word to fix all typos and ensure flawless English.\n\nNow generate the complete HTML website. Return ONLY the raw HTML starting with <!DOCTYPE html>.`;

  const stream = client.messages.stream({
    model: WEBSITE_MODEL,
    max_tokens: 64000,
    system: SYSTEM_PROMPT,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: userMessage }],
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout for full generation

  try {
    const message = await stream.finalMessage();
    clearTimeout(timeoutId);

    const rawText = extractText(message.content);

    if (!rawText) {
      throw new Error('Claude returned an empty response');
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

export async function generateLogoWithClaude(businessName: string, occupation: string, prompt: string): Promise<string | null> {
  let client: Anthropic;
  try {
    client = getClient();
  } catch {
    return null;
  }

  try {
    const message = await client.messages.create({
      model: LOGO_MODEL,
      max_tokens: 8192,
      system: "You are an expert, award-winning logo designer. Your ONLY job is to output a beautifully aesthetic, modern, and highly premium raw SVG code. Do not output anything other than the exact SVG code starting with <svg> and ending with </svg>.",
      thinking: { type: 'adaptive' },
      messages: [
        {
          role: 'user',
          content: `Generate a stunning, modern vector logo for Business: "${businessName || 'My Business'}", Industry: "${occupation || 'Services'}". Prompt: "${prompt}". Ensure it has a transparent background, cohesive brand colors, perfectly scaled proportions (use viewBox), and crisp, professional vector shapes.`,
        },
      ],
    });

    const rawText = extractText(message.content);
    const svgMatch = rawText.match(/(<svg[^>]*>[\s\S]*<\/svg>)/i);
    if (svgMatch) {
      const cleanedSvg = svgMatch[1].trim();
      const base64Svg = Buffer.from(cleanedSvg).toString('base64');
      return `data:image/svg+xml;base64,${base64Svg}`;
    }
  } catch (err) {
    console.error('[PROSERVICE-BE] Logo generation error:', err);
  }
  return null;
}
