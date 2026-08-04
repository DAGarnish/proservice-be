// src/types/form.ts
// Central type definitions for the PROSERVICE backend

export type WebsiteLookId =
  | 'professional-blue'
  | 'local-green'
  | 'warm-premium'
  | 'dark-regal'
  | 'clean-minimal'
  | 'bold-strong';

export type MainCTA = 'call' | 'quote' | 'book' | 'whatsapp' | 'email' | 'visit';

export type BookingOrWhatsapp = 'booking' | 'whatsapp' | 'none';

export interface FormData {
  // Step 1 — Business Basics
  business_name: string;
  contact_name: string;
  phone_number: string;
  email_address: string;
  confirm_email_address?: string;
  business_address: string;
  service_area: string;
  occupation: string;
  years_in_business: string;

  // Step 2 — Services
  main_services: string;
  business_description: string;
  specialities: string;
  price_list: string;
  top_services_to_promote: string;
  emergency_service: boolean;
  main_cta: MainCTA;

  // Step 3 — Trust & Credibility
  differentiator: string;
  qualifications: string;
  insurance: boolean;
  memberships: string;
  specialist_tools: string;
  testimonials: string;
  notable_work: string;
  guarantees: string;

  // Step 4 — Brand & Style
  style_preference: string[];
  preferred_colours: string;
  selected_website_look: WebsiteLookId | string;
  match_logo_colours: boolean;
  logo_uploaded: boolean;
  logo_data_url?: string;
  logo_prompt?: string;
  photos_uploaded: boolean;
  uploaded_photos_urls?: string[];
  secondary_photos_urls?: string[];
  example_websites: string;
  avoid_on_site: string;

  // Step 5 — SEO & Location
  main_city: string;
  full_service_area: string;
  priority_locations: string;
  seo_keywords: string;
  service_pages: boolean;
  location_pages: boolean;

  // Step 6 — Conversion Details
  contact_number_to_show: string;
  contact_email_to_show: string;
  contact_form: boolean;
  google_maps: boolean;
  testimonials_on_site: boolean;
  quote_request_form: boolean;
  booking_or_whatsapp: BookingOrWhatsapp | string;
  primary_language: string;
  additional_languages: string;

  // Step 7 — Add-ons & Final Details
  google_listing_option: boolean;
  branded_domain_option: boolean;
  additional_notes: string;
  seasonal_offers: string;
  competitors: string;
  avoid_wording: string;
}

// Structured brief sent to the generation server
export interface StructuredBrief {
  business_name: string;
  contact_name: string;
  phone_number: string;
  email_address: string;
  business_address: string;
  service_area: string;
  occupation: string;
  years_in_business: string;
  main_services: string;
  business_description: string;
  specialities: string;
  price_list: string;
  top_services_to_promote: string;
  emergency_service: boolean;
  main_cta: string;
  differentiator: string;
  qualifications: string;
  insurance: boolean;
  memberships: string;
  specialist_tools: string;
  testimonials: string;
  notable_work: string;
  guarantees: string;
  style_preference: string[];
  preferred_colours: string;
  selected_website_look: string;
  has_logo: boolean;
  logo_data_url?: string;
  has_photos: boolean;
  uploaded_photos_urls?: string[];
  example_websites: string;
  avoid_on_site: string;
  seo_locations: string;
  seo_keywords: string;
  contact_number_to_show: string;
  contact_email_to_show: string;
  contact_form: boolean;
  google_maps: boolean;
  testimonials_on_site: boolean;
  quote_request_form: boolean;
  booking_or_whatsapp: string;
  primary_language: string;
  additional_languages: string;
  google_listing_option: boolean;
  branded_domain_option: boolean;
  additional_notes: string;
  seasonal_offers: string;
  competitors: string;
  avoid_wording: string;
}

export interface WebsiteBrief {
  structured: StructuredBrief;
  naturalLanguage: string;
}
