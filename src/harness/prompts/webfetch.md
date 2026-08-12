Fetch a single web page and return its readable content as Markdown. Uses a real headless browser (Puppeteer) and returns `document.body.innerHTML` rendered through Turndown, so JavaScript-heavy (SPA) pages are captured after they hydrate.

HTML is aggressively cleaned before conversion: doctype, metadata, scripts, styles, forms, navigation, headers/footers, ads, and hidden content are stripped, leaving only the page's meaningful body text.

Use this to read documentation, resolve unknown libraries/APIs, or grab any content on the web. For discovery, use `websearch` instead.

Output is capped at {{DEFAULT_MAX_LENGTH}} characters by default; pass `maxLength` to raise or lower it.