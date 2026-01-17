import * as cheerio from 'cheerio';
import { decode } from 'html-entities';

export function getCheerioDoc(html: string) {
  return cheerio.load(html);
}

export function metaTagContent(doc: cheerio.CheerioAPI, type: string, attr: string) {
  const content = doc(`meta[${attr}='${type}']`).attr('content');
  if (!content) return content;

  // Decode HTML entities (e.g., &amp; -> &, &#39; -> ', etc.)
  // and properly handle Unicode characters
  return decode(content);
}

export function linkedDataScript(doc: cheerio.CheerioAPI, searchInBody: boolean = false) {
	const context = searchInBody ? null : 'head';
	const content = doc('script[type="application/ld+json"]', context).text();

	if (!content) return content;

	return JSON.parse(content);
}