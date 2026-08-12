import { describe, test, expect } from "bun:test";
import { cleanBodyHtml, htmlToMarkdown, truncateText, MAX_SEARCH_DEPTH } from "./web";

describe("cleanBodyHtml", () => {
	test("strips doctype, scripts, and styles, keeping paragraphs", () => {
		const html = `<!DOCTYPE html><html><head><title>ignored</title><style>p{color:red}</style></head><body><script>var x=1</script><p>Hello world</p></body></html>`;
		const out = cleanBodyHtml(html);
		expect(out).not.toContain("<!DOCTYPE");
		expect(out).not.toContain("script");
		expect(out).not.toContain("color:red");
		expect(out).toContain("Hello world");
	});

	test("removes chrome: nav, header, footer, aside", () => {
		const html = `<nav>Menu</nav><header>Top</header><main><p>Content</p></main><footer>Bottom</footer><aside>Sidebar</aside>`;
		const out = cleanBodyHtml(html);
		expect(out).toContain("Content");
		expect(out).not.toContain("Menu");
		expect(out).not.toContain("Top");
		expect(out).not.toContain("Bottom");
		expect(out).not.toContain("Sidebar");
	});

	test("removes interactive chrome: form, input, button, textarea", () => {
		const html = `<p>Before</p><form><input value="x"><textarea>ta</textarea><button>Go</button></form><p>After</p>`;
		const out = cleanBodyHtml(html);
		expect(out).toContain("Before");
		expect(out).toContain("After");
		expect(out).not.toMatch(/<form|<input|<textarea|<button/i);
	});

	test("removes hidden content and ads", () => {
		const html = `<p>Real</p><div hidden>Secret</div><div class="advertisement">Ad copy</div><p>Real2</p>`;
		const out = cleanBodyHtml(html);
		expect(out).toContain("Real");
		expect(out).toContain("Real2");
		expect(out).not.toContain("Secret");
		expect(out).not.toContain("Ad copy");
	});

	test("strips presentational attribute noise (class, id, style, event handlers)", () => {
		const html = `<p class="x y" id="a" style="margin:0" onclick="evil()" data-id="7">Hi</p>`;
		const out = cleanBodyHtml(html);
		expect(out).not.toContain("class=");
		expect(out).not.toContain("id=");
		expect(out).not.toContain("style=");
		expect(out).not.toContain("onclick");
		expect(out).toContain("Hi");
	});

	test("keeps href/alt/semantic attributes needed by Markdown", () => {
		const html = `<a href="https://example.com/x">Link</a>`;
		const out = cleanBodyHtml(html);
		expect(out).toContain('href="https://example.com/x"');
	});

	test("returns empty string for empty input", () => {
		expect(cleanBodyHtml("")).toBe("");
	});
});

describe("htmlToMarkdown", () => {
	test("converts headings, links, lists, and code to Markdown", () => {
		const html = `
			<h1>Title</h1>
			<p>See <a href="https://example.com">example</a>.</p>
			<ul><li>First</li><li>Second</li></ul>
			<pre><code>const x = 1;</code></pre>
		`;
		const md = htmlToMarkdown(html);
		expect(md).toContain("# Title");
		expect(md).toContain("[example](https://example.com)");
		expect(md).toMatch(/-+\s+First/);
		expect(md).toMatch(/-+\s+Second/);
		expect(md).toContain("const x = 1;");
	});

	test("returns empty string when page has no extractable content", () => {
		expect(htmlToMarkdown("<script>void 0</script>")).toBe("");
	});
});

describe("truncateText", () => {
	test("returns text unchanged when under the limit", () => {
		expect(truncateText("short", 100)).toEqual({ text: "short", truncated: false });
	});

	test("truncates and reports when over the limit", () => {
		const text = "a".repeat(10_000);
		const { text: out, truncated } = truncateText(text, 1000);
		expect(truncated).toBe(true);
		expect(out.length).toBeLessThan(text.length);
		expect(out).toContain("[Output truncated");
	});
});

describe("search depth ceiling", () => {
	test("MAX_SEARCH_DEPTH stays at 10", () => {
		expect(MAX_SEARCH_DEPTH).toBe(10);
	});
});