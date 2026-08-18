// src/services/prompt.service.ts
// Transforms raw form data into a structured website-generation brief

import { FormData, StructuredBrief, WebsiteBrief } from '../types/form';

// Real Supabase Storage URLs are ~100-150 chars. Anything far longer is a
// failed upload that fell back to an embedded base64 data: URL — left
// unguarded, one bad upload can balloon the generation prompt past Claude's
// context window and permanently fail the whole submission.
const MAX_PHOTO_URL_LENGTH = 500;
const MAX_LOGO_DATA_URL_LENGTH = 100_000;

const LOOK_LABELS: Record<string, string> = {
  'professional-blue': 'Professional Blue — trustworthy, established, trades/consultants',
  'local-green': 'Local Green — reliable, practical, eco-friendly, home services',
  'warm-premium': 'Warm Premium — grounded, traditional, boutique, family-run',
  'dark-regal': 'Dark Regal — high-end, serious, premium specialists',
  'clean-minimal': 'Clean Minimal — modern, understated, neutral professional',
  'bold-strong': 'Bold Strong — confident, urgent, emergency trades',
};

function sanitizeLogoDataUrl(logoDataUrl: string | undefined, businessName: string | undefined): string {
  if (!logoDataUrl) return '';
  if (logoDataUrl.length > MAX_LOGO_DATA_URL_LENGTH) {
    console.warn(
      `[PROMPT] Dropping oversized logo data URL (${logoDataUrl.length} chars) for "${businessName}" — likely a failed Supabase upload that fell back to embedded base64.`
    );
    return '';
  }
  return logoDataUrl;
}

export function buildWebsiteBrief(data: FormData | Partial<FormData> | any): WebsiteBrief {
  const structured: StructuredBrief = {
    business_name: data.business_name || '',
    contact_name: data.contact_name || '',
    phone_number: data.phone_number || '',
    email_address: data.email_address || '',
    business_address: data.business_address || '',
    service_area: data.service_area || '',
    occupation: data.occupation || '',
    years_in_business: data.years_in_business || '',
    main_services: data.main_services || data.occupation || '',
    business_description: data.business_description || '',
    specialities: data.specialities || '',
    price_list: data.price_list || '',
    top_services_to_promote: data.top_services_to_promote || '',
    emergency_service: Boolean(data.emergency_service),
    main_cta: data.main_cta || 'call',
    differentiator: data.differentiator || '',
    qualifications: data.qualifications || '',
    insurance: Boolean(data.insurance),
    memberships: data.memberships || '',
    specialist_tools: data.specialist_tools || '',
    testimonials: data.testimonials || '',
    notable_work: data.notable_work || '',
    guarantees: data.guarantees || '',
    style_preference: Array.isArray(data.style_preference) ? data.style_preference : [],
    preferred_colours: data.preferred_colours || '',
    selected_website_look: data.selected_website_look || 'professional-blue',
    // Derived from actual logo data rather than the (unreliable) logo_uploaded flag,
    // so the prompt never claims "Has logo: Yes" with no image to actually embed.
    has_logo: Boolean(sanitizeLogoDataUrl(data.logo_data_url, data.business_name)),
    logo_data_url: sanitizeLogoDataUrl(data.logo_data_url, data.business_name),
    has_photos: Boolean(data.photos_uploaded || (data.uploaded_photos_urls && data.uploaded_photos_urls.length > 0) || (data.secondary_photos_urls && data.secondary_photos_urls.length > 0)),
    uploaded_photos_urls: [
      ...(Array.isArray(data.uploaded_photos_urls) ? data.uploaded_photos_urls : []),
      ...(Array.isArray(data.secondary_photos_urls) ? data.secondary_photos_urls : [])
    ]
      .filter((url, index, self) => url && self.indexOf(url) === index)
      .filter((url) => {
        if (url.length > MAX_PHOTO_URL_LENGTH) {
          console.warn(
            `[PROMPT] Dropping oversized photo URL (${url.length} chars) for "${data.business_name}" — likely a failed Supabase upload that fell back to embedded base64.`
          );
          return false;
        }
        return true;
      }),
    example_websites: data.example_websites || '',
    avoid_on_site: data.avoid_on_site || '',
    seo_locations: [data.main_city, data.full_service_area, data.priority_locations]
      .filter(Boolean)
      .join('; ') || data.business_address || data.main_city || 'USA',
    seo_keywords: data.seo_keywords || '',
    contact_number_to_show: data.contact_number_to_show || (data.main_cta === 'whatsapp' ? 'HIDDEN (Use WhatsApp System/Logo)' : data.phone_number) || '',
    contact_email_to_show: data.contact_email_to_show || 'HIDDEN (Use contact form to prevent spam)',
    contact_form: data.contact_form !== undefined ? Boolean(data.contact_form) : true,
    google_maps: data.google_maps !== undefined ? Boolean(data.google_maps) : true,
    testimonials_on_site: data.testimonials_on_site !== undefined ? Boolean(data.testimonials_on_site) : true,
    quote_request_form: data.quote_request_form !== undefined ? Boolean(data.quote_request_form) : true,
    booking_or_whatsapp: data.booking_or_whatsapp || 'none',
    primary_language: data.primary_language || 'english',
    additional_languages: data.additional_languages || '',
    google_listing_option: Boolean(data.google_listing_option),
    branded_domain_option: Boolean(data.branded_domain_option),
    additional_notes: data.additional_notes || '',
    seasonal_offers: data.seasonal_offers || '',
    competitors: data.competitors || '',
    avoid_wording: data.avoid_wording || '',
  };

  const naturalLanguage = generateNaturalLanguageBrief(structured);

  return { structured, naturalLanguage };
}

function generateNaturalLanguageBrief(s: StructuredBrief): string {
  const lines: string[] = [];

  lines.push(`=== WEBSITE GENERATION BRIEF ===`);
  lines.push(`Generated by PROSERVICE platform\n`);

  lines.push(`BUSINESS OVERVIEW`);
  lines.push(`Business: ${s.business_name}`);
  lines.push(`Type: ${s.occupation}`);
  if (s.years_in_business) lines.push(`Experience: ${s.years_in_business} years in business`);
  lines.push(`Location: ${s.business_address}`);
  lines.push(`Service area: ${s.service_area}`);
  lines.push(`Contact: ${s.contact_name} — ${s.phone_number} — ${s.email_address}\n`);

  lines.push(`SERVICES & OFFERINGS`);
  lines.push(`Main services: ${s.main_services}`);
  if (s.business_description) lines.push(`Business description: ${s.business_description}`);
  if (s.specialities) lines.push(`Specialities: ${s.specialities}`);
  if (s.price_list) lines.push(`Pricing: ${s.price_list}`);
  if (s.top_services_to_promote) lines.push(`Priority services to promote: ${s.top_services_to_promote}`);
  lines.push(`Emergency/same-day service: ${s.emergency_service ? 'Yes — prominently feature this' : 'No'}`);
  if (s.main_cta === 'whatsapp') {
    lines.push(`Primary call to action: Message on WhatsApp`);
    lines.push(`CRITICAL UI REQUIREMENT: The CTA button/link MUST use a WhatsApp icon. Do NOT display the raw phone number anywhere on the page to prevent spam bots from scraping it. Only use the phone number in the actual wa.me link behind the CTA.\n`);
  } else {
    lines.push(`Primary call to action: ${s.main_cta}\n`);
  }

  lines.push(`TRUST & CREDIBILITY`);
  if (s.differentiator) lines.push(`What makes them different: ${s.differentiator}`);
  if (s.qualifications) lines.push(`Qualifications / licences: ${s.qualifications}`);
  lines.push(`Insured: ${s.insurance ? 'Yes — display insurance badge' : 'Not confirmed'}`);
  if (s.memberships) lines.push(`Memberships / trade bodies: ${s.memberships}`);
  if (s.specialist_tools) lines.push(`Specialist equipment: ${s.specialist_tools}`);
  if (s.testimonials) lines.push(`Testimonials / reviews: ${s.testimonials}`);
  if (s.notable_work) lines.push(`Notable work / clients: ${s.notable_work}`);
  if (s.guarantees) lines.push(`Guarantees / promises: ${s.guarantees}\n`);

  lines.push(`DESIGN & STYLE`);
  lines.push(`Website look: ${LOOK_LABELS[s.selected_website_look] || s.selected_website_look}`);
  if (Array.isArray(s.style_preference) && s.style_preference.length > 0) lines.push(`Style keywords: ${s.style_preference.join(', ')}`);
  if (s.preferred_colours) lines.push(`Preferred colours: ${s.preferred_colours}`);
  lines.push(`Has logo: ${s.has_logo ? 'Yes' : 'No — generate professional placeholder'}`);
  if (s.logo_data_url) lines.push(`Logo Data URL: ${s.logo_data_url}\nINSTRUCTION: The user provided their logo image as a base64 Data URL. You MUST include an <img src="${s.logo_data_url}" alt="${s.business_name} Logo" class="logo" style="max-height: 48px; width: auto; object-fit: contain;"> tag inside the header navbar and footer of the generated HTML website!`);
  lines.push(`Has photos: ${s.has_photos ? 'Yes' : 'No — use professional stock images relevant to ' + s.occupation}`);
  if (Array.isArray(s.uploaded_photos_urls) && s.uploaded_photos_urls.length > 0) {
    const photoUrlsList = s.uploaded_photos_urls.join(', ');
    lines.push(`Uploaded Photo URLs: ${photoUrlsList}\nINSTRUCTION: The user uploaded ${s.uploaded_photos_urls.length} real business photos hosted on Supabase Storage. You MUST use the FIRST photo (${s.uploaded_photos_urls[0]}) prominently as the top Hero Section background banner image (<img src="${s.uploaded_photos_urls[0]}" class="hero-bg">). You MUST ALSO display ALL uploaded photos (${photoUrlsList}) inside a dedicated, responsive "Our Work & Portfolio Gallery" section with card hover effects and across service/about cards to create an authentic, beautiful website!`);
  }
  if (s.example_websites) lines.push(`Reference websites: ${s.example_websites}`);
  if (s.avoid_on_site) lines.push(`Do NOT include: ${s.avoid_on_site}\n`);

  lines.push(`SEO & LOCATIONS`);
  lines.push(`Target locations: ${s.seo_locations}`);
  if (s.seo_keywords) lines.push(`SEO keywords: ${s.seo_keywords}`);

  lines.push(`CONTACT & CONVERSION`);
  lines.push(`Display phone: ${s.contact_number_to_show}`);
  lines.push(`Display email: ${s.contact_email_to_show}`);

  lines.push(`\nLANGUAGES`);
  const primaryLang = s.primary_language === 'english_spanish' ? 'English (Primary), Spanish (Secondary)' :
                      s.primary_language === 'spanish_english' ? 'Spanish (Primary), English (Secondary)' :
                      s.primary_language === 'spanish' ? 'Only Spanish' : 'Only English';
  lines.push(`Primary Language Options: ${primaryLang}`);
  if (s.additional_languages) {
    lines.push(`Additional Languages Requested by Client: ${s.additional_languages}`);
    lines.push(`LANGUAGE REQUIREMENT: The client has requested this website in additional language(s): ${s.additional_languages}. Implement full multi-language support on their website — translate every single word on every page/section (headings, body copy, CTAs, nav, footer, form labels, and placeholder text) into each requested language. Nothing may be left untranslated.`);
  }

  const firstSeoLoc = (s.seo_locations ? s.seo_locations.split(';')[0] : '') || s.business_address || s.service_area || 'USA';
  const features = [
    s.contact_form ? 'Styled HTML Contact Form' : '',
    s.google_maps ? `Live Google Maps iframe embed using URL: https://maps.google.com/maps?q=${encodeURIComponent(firstSeoLoc)}&t=&z=13&ie=UTF8&iwloc=&output=embed` : '',
    s.testimonials_on_site ? 'Testimonials section with star ratings' : '',
    s.quote_request_form ? 'High-converting Quote Request Form with styled input fields' : '',
    s.booking_or_whatsapp !== 'none' ? `${s.booking_or_whatsapp} integration and floating mobile action bar` : '',
    'FAQ Section with toggle/accordion answers',
  ].filter(Boolean);
  if (features.length) {
    lines.push(`MANDATORY INSTRUCTIONS:\n1. CONCISE & PUNCHY COPY (NO REPETITION): Make all copywriting crisp, scannable, and distinct across sections. Avoid long walls of text or repetitive paragraphs. Small box bullet copy ('<ul>' inside cards) is much better and higher-converting than long paragraphs of text.\n2. SERVICES SECTION — PUNCHY INTRO & CARDS: Write a brief, powerful 2-3 sentence introduction selling their workmanship and customer care, followed immediately by structured service cards with bulleted highlights (${s.main_services}, ${s.specialities || ''}). Do not write bloated paragraphs.\n3. PORTFOLIO / OUR WORK GALLERY — THREE-ROW LAYOUT (CRITICAL): Build a dedicated "Our Work & Portfolio" section with a real, specific heading (tied to the business/location, not just the word "Gallery") and one short description line that refers only to the photos actually shown below it — never a generic invitational line like "Take a look at our recent projects, equipment, and professional standards" pointing at content that isn't rendered. Arrange the uploaded photos into exactly THREE distinct rows (not one continuous auto-fit grid) — split the photos as evenly as possible across the three rows (e.g. 6 photos → 2/2/2, 7 photos → 3/2/2, 4 photos → 2/1/1) so no row is left with an awkward gap. Within a single row, every image box must be identical size ('aspect-ratio: 4/3; width: 100%; border-radius: 12px; overflow: hidden; position: relative; display: block;') with the '<img>' filling it via 'width: 100%; height: 100%; object-fit: cover; object-position: center center; display: block;'. You may vary the height slightly between the three rows (e.g. a taller middle row) for editorial rhythm, but never within a row. If fewer than 3 photos are supplied, do not force empty rows — use only as many rows as photos genuinely support, and never duplicate a photo just to fill a row.\n4. MAP: You MUST include the live interactive Google Map iframe with the URL above. Never create empty placeholders!\n5. FAQ: Include a dedicated FAQ section answering 4 common questions for ${s.occupation}.\n6. FORM: Include a styled HTML lead capture form (Name, Phone, Email, Service Needed, Message).\n7. MOBILE: Include a fixed bottom mobile action bar for easy calling/messaging on smartphones.\n8. VISUAL DESIGN & TYPO CHECK: Use state-of-the-art modern aesthetics, vibrant gradients, rich card layouts, and Google Fonts. Check every word to fix all typos and ensure flawless English.\n`);
  }

  if (s.additional_notes) lines.push(`Additional instructions: ${s.additional_notes}`);
  if (s.seasonal_offers) lines.push(`Seasonal offers: ${s.seasonal_offers}`);
  if (s.competitors) lines.push(`Competitor references: ${s.competitors}`);
  if (s.avoid_wording) lines.push(`Avoid this language/topics: ${s.avoid_wording}`);

  lines.push(`\n=== END OF BRIEF ===`);

  return lines.join('\n');
}
