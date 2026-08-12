Search the web with DuckDuckGo and return the top results as Markdown. Each result page is fetched through a headless browser (Puppeteer) and converted to Markdown with Turndown, so JavaScript-heavy pages are captured after hydration. The response opens with a compact list of the results (title, URL, snippet), followed by the converted content of each fetched page.

`depth` controls how many results are fetched, from 1 to {{MAX_SEARCH_DEPTH}} (default {{DEFAULT_SEARCH_DEPTH}}). If DuckDuckGo finds more than `depth` results, only the first `depth` are fetched. Pages that fail to load are listed under "Fetch failures".

Use this to find library documentation, research unknown topics, or locate anything on the web. To read a known URL directly, use `webfetch` instead.

Combined output is capped at {{DEFAULT_MAX_LENGTH}} characters by default; pass `maxLength` to raise or lower it.