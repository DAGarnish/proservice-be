// src/services/htmlSafeguard.service.ts
// Enhances generated HTML to enforce responsive headers, logo embedding, uniform photo boxes, and interactive maps.

export function enhanceGeneratedHtml(
  html: string,
  logoUrl?: string | null,
  businessName?: string | null,
  photoUrls?: string[] | null,
  location?: string | null
): string {
  if (!html) return html;
  let modified = html;
  const bName = businessName || 'Business';
  const mapLoc = location || bName || 'United States';

  // 1. Guarantee Logo Embedding
  if (logoUrl) {
    let replaced = modified.replace(/(<img[^>]*(?:class|alt)=["'][^"']*logo[^"']*["'][^>]*src=["'])([^"']*)(["'])/gi, `$1${logoUrl}$3`);
    if (!replaced.includes(logoUrl)) {
      replaced = replaced.replace(/(<img[^>]*src=["'])([^"']*)(["'][^>]*(?:class|alt)=["'][^"']*logo[^"']*["'])/gi, `$1${logoUrl}$3`);
    }
    if (!replaced.includes(logoUrl)) {
      const imgTag = `<img src="${logoUrl}" alt="${bName} Logo" class="logo" style="max-height: 48px; width: auto; object-fit: contain; margin-right: 12px;" />`;
      replaced = replaced.replace(/(<header[^>]*>|<nav[^>]*>)/i, `$1\n  ${imgTag}`);
    }
    if (replaced.includes('<footer') && !replaced.split('<footer')[1].includes(logoUrl)) {
      const footerImg = `<img src="${logoUrl}" alt="${bName} Logo" style="max-height: 36px; width: auto; object-fit: contain; margin-bottom: 12px;" />`;
      replaced = replaced.replace(/(<footer[^>]*>)/i, `$1\n  <div style="margin-bottom: 1rem;">${footerImg}</div>`);
    }
    modified = replaced;
  }

  // 2. Guarantee Uploaded Image is Featured in the Hero Section & Replace Placeholders
  if (photoUrls && photoUrls.length > 0) {
    const mainHeroPhoto = photoUrls[0];

    if (/(<section[^>]*(?:id|class)=["'][^"']*hero[^"']*["'][^>]*>)([\s\S]*?)(<\/section>)/i.test(modified)) {
      modified = modified.replace(/(<section[^>]*(?:id|class)=["'][^"']*hero[^"']*["'][^>]*>)([\s\S]*?)(<\/section>)/i, (match, openTag, heroContent, closeTag) => {
        if (/<img[^>]*src=["'][^"']*["']/i.test(heroContent)) {
          let replacedFirstImg = false;
          const newHeroContent = heroContent.replace(/(<img[^>]*src=["'])([^"']*)(["'][^>]*>)/gi, (m: string, p1: string, oldSrc: string, p2: string) => {
            if (!replacedFirstImg && (!logoUrl || oldSrc !== logoUrl)) {
              replacedFirstImg = true;
              return `${p1}${mainHeroPhoto}${p2}`;
            }
            return m;
          });
          return `${openTag}${newHeroContent}${closeTag}`;
        } else {
          const heroBannerBox = `\n  <div style="margin-top: 2rem; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); max-height: 520px; border: 4px solid rgba(255,255,255,0.2); background: #0f172a; display: flex; align-items: center; justify-content: center; padding: 12px;"><img src="${mainHeroPhoto}" alt="${bName} Hero Banner" style="max-width: 100%; max-height: 480px; width: auto; height: auto; object-fit: contain; object-position: center; display: block;" /></div>\n`;
          return `${openTag}${heroContent}${heroBannerBox}${closeTag}`;
        }
      });
    }

    let photoIdx = 0;
    modified = modified.replace(/(<img[^>]*src=["'])([^"']*)(["'])/gi, (match, prefix, oldUrl, suffix) => {
      if (logoUrl && oldUrl === logoUrl) return match;
      if (photoUrls.includes(oldUrl)) return match;
      if (oldUrl.startsWith('data:image') && !oldUrl.includes('placeholder')) return match;
      
      const newUrl = photoUrls[photoIdx % photoUrls.length];
      photoIdx++;
      return `${prefix}${newUrl}${suffix}`;
    });

    const hasUploadedPhoto = photoUrls.some(url => modified.includes(url));
    if ((!hasUploadedPhoto || photoUrls.length > 1) && !modified.includes('ai-safeguard-gallery')) {
      const galleryHtml = `
<!-- AI Safeguard: Uploaded Business Photos Gallery -->
<section class="ai-safeguard-gallery" id="gallery" style="padding: 4.5rem 1.5rem; background: #f8fafc; text-align: center;">
  <div style="max-width: 1150px; margin: 0 auto;">
    <h2 style="font-size: 2.3rem; font-weight: 800; margin-bottom: 0.6rem; color: #0f172a;">Our Work &amp; Portfolio Gallery</h2>
    <p style="color: #4b5563; margin-bottom: 3rem; font-size: 1.15rem;">Take a look at our recent projects, equipment, and professional standards.</p>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.75rem; align-items: stretch;">
      ${photoUrls.map((url, i) => `
        <div style="border-radius: 14px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12); aspect-ratio: 16 / 10; height: 260px; width: 100%; background: #1e293b; position: relative; margin: 0; padding: 0 !important; display: block;">
          <img src="${url}" alt="${bName} photo ${i + 1}" style="width: 100% !important; height: 100% !important; max-width: none !important; max-height: none !important; object-fit: cover !important; object-position: center !important; display: block !important; margin: 0 !important; padding: 0 !important; border-radius: 0 !important; transition: transform 0.4s ease;" />
        </div>
      `).join('')}
    </div>
  </div>
</section>`;
      if (modified.includes('<footer')) {
        modified = modified.replace(/<footer/i, `${galleryHtml}\n<footer`);
      } else if (modified.includes('</body>')) {
        modified = modified.replace('</body>', `${galleryHtml}\n</body>`);
      } else {
        modified += galleryHtml;
      }
    }
  }

  // 3. Guarantee Interactive Google Map Iframe
  if (!/maps\.google\.com|google\.com\/maps|output=embed/i.test(modified)) {
    const mapIframe = `<iframe src="https://maps.google.com/maps?q=${encodeURIComponent(mapLoc)}&t=&z=13&ie=UTF8&iwloc=&output=embed" width="100%" height="380" frameborder="0" style="border:0; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); width: 100%;" allowfullscreen="" loading="lazy"></iframe>`;
    
    let mapInjected = false;
    if (/(<div[^>]*(?:id|class)=["'][^"']*(?:map|location|service-area)[^"']*["'][^>]*>)([\s\S]*?)(<\/div>)/i.test(modified)) {
      modified = modified.replace(/(<div[^>]*(?:id|class)=["'][^"']*(?:map|location|service-area)[^"']*["'][^>]*>)([\s\S]*?)(<\/div>)/i, (m, open, content, close) => {
        if (!content.includes('<iframe') && !content.includes('<img')) {
          mapInjected = true;
          return `${open}\n  <div style="padding: 10px; background: #fff; border-radius: 12px;">${mapIframe}</div>\n${close}`;
        }
        return m;
      });
    }

    if (!mapInjected) {
      const mapSectionHtml = `
<!-- AI Safeguard: Service Area Interactive Google Map -->
<section class="ai-safeguard-map" style="padding: 4rem 1.5rem; background: #f8f9fa; text-align: center;">
  <div style="max-width: 1000px; margin: 0 auto;">
    <h2 style="font-size: 2.2rem; font-weight: 700; margin-bottom: 0.5rem; color: #1f2937;">Our Service Area &amp; Location</h2>
    <p style="color: #4b5563; margin-bottom: 2rem; font-size: 1.1rem;">Proudly serving customers across ${mapLoc} and surrounding areas.</p>
    <div style="border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); background: #fff; padding: 8px;">
      ${mapIframe}
    </div>
  </div>
</section>`;
      if (modified.includes('<footer')) {
        modified = modified.replace(/<footer/i, `${mapSectionHtml}\n<footer`);
      } else if (modified.includes('</body>')) {
        modified = modified.replace('</body>', `${mapSectionHtml}\n</body>`);
      } else {
        modified += mapSectionHtml;
      }
    }
  }

  // 4. Inject Responsive Compact Header & Mobile Menu Auto-Close Script & Style
  const safeguardStyleAndScript = `
<!-- AI Safeguard: Responsive Compact Header, Anti-Crop Image Safeguard & Auto-Close Mobile Menu -->
<style>
  img:not(.logo) {
    max-width: 100% !important;
    height: auto !important;
    object-fit: contain !important;
    object-position: center;
    border-radius: 8px;
  }
  /* Enforce identical, gap-free edge-to-edge photos for all galleries, cards, and grid items */
  .ai-safeguard-gallery img,
  [class*="gallery"] img,
  [class*="portfolio"] img,
  [class*="grid"] img:not(.logo),
  [class*="card"] img:not(.logo),
  section[id*="gallery"] img {
    width: 100% !important;
    height: 100% !important;
    min-height: 220px !important;
    max-height: 320px !important;
    object-fit: cover !important;
    object-position: center !important;
    display: block !important;
    margin: 0 !important;
    padding: 0 !important;
    border-radius: 12px;
  }
  .ai-safeguard-gallery div,
  [class*="gallery"] [class*="item"],
  [class*="grid"] > div:has(img:not(.logo)) {
    overflow: hidden !important;
    border-radius: 12px !important;
    padding: 0 !important;
    display: flex !important;
    align-items: stretch !important;
  }
  @media (max-width: 768px) {
    header, .header, .navbar, [class*="header"] {
      display: flex !important;
      flex-wrap: nowrap !important;
      justify-content: space-between !important;
      align-items: center !important;
      padding: 0.6rem 1rem !important;
      max-height: 68px !important;
      height: auto !important;
      position: sticky !important;
      top: 0 !important;
      z-index: 9999 !important;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08) !important;
      background: #ffffff !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }
    header img, .header img, [class*="header"] img {
      max-height: 36px !important;
      width: auto !important;
      object-fit: contain !important;
    }
    header nav, .header nav, [class*="header"] nav, nav, ul.menu, .nav-links {
      display: none !important;
      position: absolute !important;
      top: 100% !important;
      left: 0 !important;
      right: 0 !important;
      background: #ffffff !important;
      flex-direction: column !important;
      padding: 1.25rem !important;
      box-shadow: 0 15px 30px rgba(0,0,0,0.15) !important;
      border-bottom: 2px solid #3b82f6 !important;
      z-index: 9998 !important;
      gap: 1rem !important;
    }
    header nav.mobile-open, .header nav.mobile-open, nav.mobile-open, ul.menu.mobile-open, .nav-links.mobile-open {
      display: flex !important;
    }
    .ai-hamburger-toggle {
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: transparent;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 1.4rem;
      color: #1f2937;
      cursor: pointer;
      z-index: 10000;
      flex-shrink: 0;
    }
  }
  @media (min-width: 769px) {
    .ai-hamburger-toggle { display: none !important; }
  }
  html { scroll-behavior: smooth !important; }
</style>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    var header = document.querySelector('header') || document.querySelector('.header') || document.querySelector('[class*="header"]');
    var nav = document.querySelector('header nav') || document.querySelector('nav') || document.querySelector('.nav-links') || document.querySelector('ul');
    if (header && nav) {
      if (!document.querySelector('.ai-hamburger-toggle')) {
        var btn = document.createElement('button');
        btn.className = 'ai-hamburger-toggle';
        btn.innerHTML = '☰';
        btn.setAttribute('aria-label', 'Toggle Navigation');
        btn.onclick = function(e) {
          e.stopPropagation();
          var isOpen = nav.classList.toggle('mobile-open');
          btn.innerHTML = isOpen ? '✕' : '☰';
        };
        header.appendChild(btn);
      }
      var links = nav.querySelectorAll('a, span, button');
      links.forEach(function(link) {
        link.addEventListener('click', function() {
          nav.classList.remove('mobile-open');
          var btn = document.querySelector('.ai-hamburger-toggle');
          if (btn) btn.innerHTML = '☰';
        });
      });
    }

    var sections = document.querySelectorAll('section, div[class*="section"], div[id*="section"], main > div, article, .ai-safeguard-map, .ai-safeguard-gallery');
    sections.forEach(function(sec) {
      var text = (sec.textContent || '').toLowerCase();
      var id = sec.getAttribute('id') || '';
      if (!id) {
        if (text.includes('about us') || text.includes('who we are') || text.includes('our story')) sec.id = 'about';
        else if (text.includes('our services') || text.includes('what we do') || text.includes('services')) sec.id = 'services';
        else if (text.includes('pricing') || text.includes('packages') || text.includes('our plans')) sec.id = 'pricing';
        else if (text.includes('frequently asked') || text.includes('faq') || text.includes('questions')) sec.id = 'faq';
        else if (text.includes('contact us') || text.includes('get in touch') || text.includes('request a quote') || text.includes('free quote')) sec.id = 'contact';
        else if (text.includes('service area') || text.includes('where we operate') || text.includes('location') || sec.classList.contains('ai-safeguard-map')) sec.id = 'location';
        else if (text.includes('why choose') || text.includes('guarantee') || text.includes('trust')) sec.id = 'why-us';
        else if (text.includes('work') || text.includes('gallery') || text.includes('projects') || sec.classList.contains('ai-safeguard-gallery')) sec.id = 'gallery';
      }
    });

    var navLinks = document.querySelectorAll('header a, nav a, .navbar a, [class*="nav"] a, header span, nav span, ul.menu a, ul.menu span');
    navLinks.forEach(function(link) {
      var linkText = (link.textContent || '').trim().toLowerCase();
      var targetId = '';
      if (linkText.includes('about')) targetId = 'about';
      else if (linkText.includes('service')) targetId = 'services';
      else if (linkText.includes('price') || linkText.includes('pricing') || linkText.includes('plan')) targetId = 'pricing';
      else if (linkText.includes('faq') || linkText.includes('question')) targetId = 'faq';
      else if (linkText.includes('contact') || linkText.includes('quote') || linkText.includes('touch')) targetId = 'contact';
      else if (linkText.includes('area') || linkText.includes('location') || linkText.includes('map')) targetId = 'location';
      else if (linkText.includes('work') || linkText.includes('gallery') || linkText.includes('project')) targetId = 'gallery';
      else if (linkText.includes('why') || linkText.includes('trust')) targetId = 'why-us';
      else if (link.getAttribute('href') && link.getAttribute('href').startsWith('#') && link.getAttribute('href').length > 1) {
        targetId = link.getAttribute('href').substring(1);
      }

      if (targetId) {
        link.style.cursor = 'pointer';
        link.addEventListener('click', function(e) {
          var targetEl = document.getElementById(targetId) || document.querySelector('[id*="' + targetId + '"]') || document.querySelector('[class*="' + targetId + '"]');
          if (targetEl) {
            e.preventDefault();
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      }
    });
  });
</script>
`;

  if (!modified.includes('ai-hamburger-toggle')) {
    if (modified.includes('</body>')) {
      modified = modified.replace('</body>', `${safeguardStyleAndScript}\n</body>`);
    } else {
      modified = modified + safeguardStyleAndScript;
    }
  }

  return modified;
}
