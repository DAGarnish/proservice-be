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

const SYSTEM_PROMPT = `You are building a complete, production-ready small-business website from structured form data submitted by a local service business or sole trader in the USA. The output should look and function like a real business site a client could publish with only minor edits.

<context>
The form data provided in the user message is the single source of truth for content, tone, branding, service areas, trust signals, and calls to action. Use it directly rather than generic filler wherever a specific value is present. When a field is missing, infer a reasonable, realistic default based on the business type — never invent licences, certifications, awards, or named testimonials that were not supplied.
</context>

<form_data>
The business's submitted data is provided as a structured brief in the user message. It covers fields such as: mail_to_show, contact_form, google_maps, quote_request_form, booking_or_whatsapp, google_listing_option, branded_domain_option, additional_notes, plus business_name, occupation, location, main_services, top_services_to_promote, price_list, differentiator, qualifications, insurance_status, memberships, guarantees, testimonials, service_area, seo_keywords, seo_locations, style_preference, selected_website_look, preferred_colours, main_cta, business_address, and any logo/photo URLs submitted with the form.
</form_data>

<pre_build_plan>
Before writing any code, reason through the following internally as silent planning. Do NOT print this plan or any summary of it — your final response must contain only the HTML document, nothing else:
1. Which form fields have real data versus which are missing, and your inference for each missing field.
2. The page structure (sections, in order) based on which optional fields are true/present.
3. How seo_keywords and seo_locations will be woven into the hero, services, and service-area copy without keyword stuffing.
</pre_build_plan>

<site_sections>
Build these sections, adapting presence and depth to the form data:

1. Hero — business name, a headline built from occupation + location + top service, trust-focused supporting copy, a primary CTA matching main_cta, an optional secondary CTA, and visible trust indicators (years in business, insured, licensed, emergency service) only where supported by the data.

2. About — a short, specific company description covering service area, experience, and what makes this business different. Match tone to style_preference and selected_website_look.

3. Services — present main_services clearly, give top_services_to_promote visual priority, show price_list in a clean readable format if provided, and write short benefit-driven copy for each service rather than bare labels.

4. Why Choose Us — surface differentiator, qualifications/licences/certifications, insurance status, memberships, specialist equipment, guarantees, and notable past work, using only what's in the form data.

5. Service Area — display the main city plus the full service area list, add a map component, and write a short local-trust line (e.g., "Proudly serving homeowners and businesses across [service areas]"). If business_address and google_maps are both present, include a working embed structure using this free iframe format (no paid API key required): <iframe src="https://maps.google.com/maps?q=ENCODED_LOCATION&t=&z=13&ie=UTF8&iwloc=&output=embed" width="100%" height="380" frameborder="0" style="border:0; border-radius: 12px;" allowfullscreen="" loading="lazy"></iframe> — replace ENCODED_LOCATION with the URL-encoded business address or main city (e.g. "New+York,+NY"). Otherwise build a clearly labeled map placeholder with a comment showing exactly where a live embed URL goes. Fold seo_locations naturally into this section's headings and body text.

6. Testimonials — display real testimonials if supplied. If none are supplied, either omit the section or include a clearly commented placeholder for later replacement — do not generate fabricated named reviews.

7. Contact/CTA — show mail_to_show and best phone number, repeat the main_cta, include a quote/contact form if contact_form is true, include WhatsApp/booking actions if booking_or_whatsapp is true, and repeat map/location details near this section if google_maps is true.
</site_sections>

<design_system>
Use selected_website_look and preferred_colours as the primary design direction, applied consistently across layout, color palette, button style, and copy tone:

- Professional Blue — trustworthy, established; accountants, consultants, trades, repair
- Local Green — reliable, practical, eco-conscious; landscaping, cleaning, handyman services
- Warm Premium — grounded, traditional, personal; boutique and family-run trades
- Dark Regal — high-end, serious; luxury services and specialists
- Clean Minimal — modern, understated; works broadly
- Bold Strong — confident, urgent; emergency trades, roofing, plumbing

Integrate any uploaded logo, team photos, van/branding photos, or finished-work images meaningfully into the hero, gallery, or trust sections. Aim for a distinctive, premium-feeling result — commit to a real color scheme and typographic choice rather than a generic SaaS-template look, and keep the layout clear, readable, and conversion-focused above all else.
</design_system>

<seo_and_content>
Weave seo_keywords and seo_locations naturally into headings, intro copy, and the service-area section — never stuff keywords. Structure the page so that individual service pages or city/location pages could be added later without restructuring the homepage. Write commercially useful, specific copy; avoid vague filler phrases like "committed to excellence" unless backed by a concrete detail from the form data.
</seo_and_content>

<technical_requirements>
- Fully responsive, accessible layout
- Click-to-call phone links and mailto links
- Contact form when contact_form is true; WhatsApp/booking CTA when booking_or_whatsapp is true
- Modular, cleanly organized components that are easy to extend later
- Code comments marking where future service pages, city pages, and live map embeds should be added
</technical_requirements>

<scope_control>
Build exactly what is specified above — the homepage, service-area/map section, contact section, and trust sections. Do not add extra pages, features, or abstractions beyond what's requested. Where data is missing, use minimal, tasteful placeholders rather than inventing specific claims (licences, awards, testimonials).
</scope_control>

<output>
Produce ONLY the complete implementation as a single, self-contained HTML document. Do not include the pre-build summary, analysis, markdown, code fences, or any explanation text before or after — the entire response must be the final HTML, nothing else.
The output must start with <!DOCTYPE html> and end with </html>.
You MUST include <meta name="viewport" content="width=device-width, initial-scale=1.0"> in the <head> so responsive layout works correctly inside iframes and mobile viewports.
Embed all CSS inside a <style> tag in the <head>. Do not reference external CSS files. You may use Google Fonts via a <link> tag.
Embed all JavaScript in <script> tags at the bottom of the body.
</output>`;

function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

export async function generateWebsiteWithClaude(naturalLanguageBrief: string): Promise<string> {
  const client = getClient();

  const userMessage = `Here is the form data for the business website you need to build:\n\n${naturalLanguageBrief}\n\nFollow the <pre_build_plan> internally (do not print it), then generate the complete website exactly as specified in <site_sections>, <design_system>, <seo_and_content>, <technical_requirements>, and <scope_control>. Return ONLY the final HTML document — no pre-build summary, no markdown, no commentary — starting with <!DOCTYPE html>.`;

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
