const SITES = [
  { name: 'Wikipedia — Typography', url: 'https://en.wikipedia.org/wiki/Typography' },
  { name: 'CERN — The First Website', url: 'https://info.cern.ch/hypertext/WWW/TheProject.html' },
  { name: 'GNU', url: 'https://www.gnu.org/' },
  { name: 'W3C', url: 'https://www.w3.org/' },
  { name: 'RFC Editor', url: 'https://www.rfc-editor.org/' },
  { name: 'Paul Graham', url: 'https://www.paulgraham.com/articles.html' },
  { name: 'Example', url: 'https://example.com/' },
  { name: 'IANA', url: 'https://www.iana.org/help/example-domains' }
];

function validPalette(raw) {
  const colors = String(raw || '')
    .split(',')
    .map(v => v.trim().toUpperCase())
    .filter(v => /^#[0-9A-F]{6}$/.test(v));

  return colors.length >= 2 ? colors.slice(0, 8) : null;
}

function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function sanitizeThirdPartyHtml(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<script\b[^>]*\/\s*>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, '')
    .replace(/<object\b[^>]*>[\s\S]*?<\/object\s*>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*http-equiv\s*=\s*["']?(?:content-security-policy|refresh)["']?[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(["']).*?\1/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '');
}

function injectIntoHead(html, content) {
  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/<head\b[^>]*>/i, match => `${match}\n${content}`);
  }
  return `${content}\n${html}`;
}

function injectBeforeBodyEnd(html, content) {
  if (/<\/body\s*>/i.test(html)) {
    return html.replace(/<\/body\s*>/i, `${content}\n</body>`);
  }
  return `${html}\n${content}`;
}

function overlayHtml(site, colors) {
  const qs = encodeURIComponent(colors.join(','));
  const original = site.url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const siteName = site.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `
  <div id="__dye_ui__" data-dye-ui>
    <div class="__dye_name">DYE THE WEB</div>
    <div class="__dye_site">${siteName}</div>
    <div class="__dye_swatches">
      ${colors.map(c => `<span style="background:${c}"></span>`).join('')}
    </div>
    <a href="/api/random?colors=${qs}" class="__dye_btn">SOMEWHERE ELSE</a>
    <a href="/" class="__dye_btn __dye_secondary">NEW COLOR</a>
    <a href="${original}" class="__dye_original" target="_blank" rel="noopener noreferrer">ORIGINAL ↗</a>
  </div>`;
}

function dyeCss() {
  return `
  <style id="__dye_css__">
    #__dye_ui__ {
      all: initial !important;
      position: fixed !important;
      top: 16px !important;
      right: 16px !important;
      z-index: 2147483647 !important;
      width: 220px !important;
      padding: 12px !important;
      border: 1px solid #111 !important;
      background: #ecebe7 !important;
      color: #111 !important;
      font-family: Helvetica, Arial, sans-serif !important;
      box-shadow: 0 8px 28px rgba(0,0,0,.15) !important;
    }
    #__dye_ui__ * { box-sizing: border-box !important; font-family: Helvetica, Arial, sans-serif !important; }
    #__dye_ui__ .__dye_name { font-size: 11px !important; letter-spacing: .11em !important; margin-bottom: 4px !important; }
    #__dye_ui__ .__dye_site { font-size: 8px !important; letter-spacing: .07em !important; opacity: .55 !important; margin-bottom: 10px !important; }
    #__dye_ui__ .__dye_swatches { display: flex !important; height: 24px !important; border: 1px solid #111 !important; margin-bottom: 9px !important; }
    #__dye_ui__ .__dye_swatches span { flex: 1 !important; }
    #__dye_ui__ .__dye_btn {
      display: block !important; min-height: 31px !important; padding: 9px 8px !important; margin-top: 5px !important;
      border: 1px solid #111 !important; background: #111 !important; color: #ecebe7 !important;
      text-decoration: none !important; text-align: center !important; font-size: 8px !important; letter-spacing: .08em !important;
    }
    #__dye_ui__ .__dye_secondary { background: transparent !important; color: #111 !important; }
    #__dye_ui__ .__dye_original { display: block !important; margin-top: 8px !important; color: #111 !important; font-size: 7px !important; letter-spacing: .08em !important; text-decoration: none !important; opacity: .55 !important; }
  </style>`;
}

function recolorScript(colors) {
  return `
  <script id="__dye_script__">
  (() => {
    const palette = ${safeJson(colors)};
    const ui = document.getElementById('__dye_ui__');

    const hexToRgb = hex => {
      const v = hex.replace('#','');
      return { r: parseInt(v.slice(0,2),16), g: parseInt(v.slice(2,4),16), b: parseInt(v.slice(4,6),16) };
    };

    const hslLight = (r,g,b) => {
      r/=255; g/=255; b/=255;
      const max=Math.max(r,g,b), min=Math.min(r,g,b);
      return (max+min)/2;
    };

    const parse = color => {
      if(!color || color === 'transparent') return null;
      const m = color.match(/rgba?\\(([-\\d.]+)[,\\s]+([-\\d.]+)[,\\s]+([-\\d.]+)(?:[,\\s/]+([-\\d.]+))?\\)/);
      if(!m) return null;
      return { r:+m[1], g:+m[2], b:+m[3], a:m[4] === undefined ? 1 : +m[4] };
    };

    const paletteInfo = palette.map(hex => {
      const rgb=hexToRgb(hex);
      return { hex, light:hslLight(rgb.r,rgb.g,rgb.b) };
    });

    const nearest = light => {
      let best=paletteInfo[0], dist=Infinity;
      for(const item of paletteInfo){
        const d=Math.abs(item.light-light);
        if(d<dist){ dist=d; best=item; }
      }
      return best.hex;
    };

    const sorted=[...paletteInfo].sort((a,b)=>a.light-b.light);
    const darkest=sorted[0].hex;
    const lightest=sorted[sorted.length-1].hex;
    const accent=palette[Math.min(2,palette.length-1)];

    const skip = el => {
      if(!el || el.nodeType !== 1) return true;
      if(el === ui || el.closest('#__dye_ui__')) return true;
      return ['SCRIPT','STYLE','LINK','META','HEAD','TITLE','SOURCE','PATH','BASE'].includes(el.tagName);
    };

    const all=[document.documentElement, document.body, ...document.body.querySelectorAll('*')];
    for(const el of all){
      if(skip(el)) continue;
      const rect=el.getBoundingClientRect();
      if(!rect.width && !rect.height) continue;
      const cs=getComputedStyle(el);

      const bg=parse(cs.backgroundColor);
      if(bg && bg.a > .04){
        el.style.setProperty('background-color', nearest(hslLight(bg.r,bg.g,bg.b)), 'important');
      }

      const fg=parse(cs.color);
      if(fg){
        let next = nearest(hslLight(fg.r,fg.g,fg.b));
        if(el.matches('a') || el.closest('a')) next = accent;
        el.style.setProperty('color', next, 'important');
        el.style.setProperty('text-decoration-color', next, 'important');
      }

      const border=parse(cs.borderTopColor);
      if(border && cs.borderTopStyle !== 'none'){
        el.style.setProperty('border-color', nearest(hslLight(border.r,border.g,border.b)), 'important');
      }

      if(['BUTTON','INPUT','SELECT','TEXTAREA'].includes(el.tagName)){
        el.style.setProperty('background-color', darkest, 'important');
        el.style.setProperty('color', lightest, 'important');
        el.style.setProperty('border-color', darkest, 'important');
      }
    }
  })();
  </script>`;
}

export default async function handler(req, res) {
  const colors = validPalette(req.query.colors);
  if (!colors) {
    res.statusCode = 302;
    res.setHeader('Location', '/');
    return res.end();
  }

  const start = Math.floor(Math.random() * SITES.length);
  let lastError = null;

  for (let i = 0; i < SITES.length; i++) {
    const site = SITES[(start + i) % SITES.length];

    try {
      const response = await fetch(site.url, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DyeTheWeb/1.0; +https://vercel.app/)'
        }
      });

      if (!response.ok) throw new Error(`Upstream ${response.status}`);

      const type = response.headers.get('content-type') || '';
      if (!type.includes('text/html')) throw new Error('Not HTML');

      let html = await response.text();
      if (html.length > 2_000_000) throw new Error('Page too large');

      html = sanitizeThirdPartyHtml(html);

      const base = `<base href="${site.url.replace(/"/g, '&quot;')}">`;
      html = injectIntoHead(html, `${base}\n${dyeCss()}`);
      html = injectBeforeBodyEnd(html, `${overlayHtml(site, colors)}\n${recolorScript(colors)}`);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.statusCode = 200;
      return res.end(html);
    } catch (error) {
      lastError = error;
    }
  }

  res.statusCode = 502;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.end(`<!doctype html><html><body style="font-family:Helvetica,Arial,sans-serif;padding:40px"><h1>Couldn't find somewhere this time.</h1><p>${String(lastError?.message || 'Unknown error')}</p><p><a href="/">Try again</a></p></body></html>`);
}
