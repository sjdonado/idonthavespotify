import * as cheerio from 'cheerio';

export function getCheerioDoc(html: string) {
  return cheerio.load(html);
}

export function metaTagContent(doc: cheerio.CheerioAPI, type: string, attr: string) {
  return doc(`meta[${attr}='${type}']`).attr('content');
}
