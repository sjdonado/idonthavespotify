import { describe, expect, it } from 'bun:test';

import { cleanSearchQuery } from '~/utils/query';

describe('cleanSearchQuery', () => {
  describe('German-style quotation marks', () => {
    it('should remove German low-high quotation marks', () => {
      // U+201E „ and U+201C "
      expect(cleanSearchQuery('\u201EThe Scientist\u201C')).toBe('The Scientist');
    });

    it('should remove German quotation marks from Apple Music metadata', () => {
      // U+201E „ and U+201C "
      expect(cleanSearchQuery('\u201Eno tiene sentido\u201C')).toBe('no tiene sentido');
    });
  });

  describe('French guillemets', () => {
    it('should remove French double guillemets', () => {
      // U+00AB « and U+00BB »
      expect(cleanSearchQuery('\u00ABChanson\u00BB')).toBe('Chanson');
    });

    it('should remove French single guillemets', () => {
      // U+2039 ‹ and U+203A ›
      expect(cleanSearchQuery('\u2039Single\u203A')).toBe('Single');
    });
  });

  describe('CJK quotation marks', () => {
    it('should remove CJK corner brackets', () => {
      // U+300E 『 and U+300F 』
      expect(cleanSearchQuery('\u300ETitle\u300F')).toBe('Title');
    });

    it('should remove CJK single corner brackets', () => {
      // U+300C 「 and U+300D 」
      expect(cleanSearchQuery('\u300CTitle\u300D')).toBe('Title');
    });
  });

  describe('fancy apostrophes', () => {
    it('should normalize right single quotation mark', () => {
      // U+2019 ' -> U+0027 '
      expect(cleanSearchQuery('It\u2019s Gonna Be Me')).toBe("It's Gonna Be Me");
    });

    it('should normalize left single quotation mark', () => {
      // U+2018 ' -> U+0027 '
      expect(cleanSearchQuery('\u2018Twas the Night')).toBe("'Twas the Night");
    });

    it('should normalize single low-9 quotation mark', () => {
      // U+201A ‚ and U+201B ‛ -> U+0027 '
      expect(cleanSearchQuery('Rock \u201An\u201B Roll')).toBe("Rock 'n' Roll");
    });
  });

  describe('fancy double quotes', () => {
    it('should remove curly double quotes', () => {
      // U+201C " and U+201D "
      expect(cleanSearchQuery('\u201CHello World\u201D')).toBe('Hello World');
    });
  });

  describe('middle dot', () => {
    it('should replace middle dot with space', () => {
      // U+00B7 ·
      expect(cleanSearchQuery('Artist \u00B7 Song')).toBe('Artist Song');
    });

    it('should handle multiple middle dots', () => {
      expect(cleanSearchQuery('A \u00B7 B \u00B7 C')).toBe('A B C');
    });
  });

  describe('special dashes', () => {
    it('should normalize en-dash to hyphen', () => {
      // U+2013 –
      expect(cleanSearchQuery('Twenty\u2013One Pilots')).toBe('Twenty-One Pilots');
    });

    it('should normalize em-dash to hyphen', () => {
      // U+2014 —
      expect(cleanSearchQuery('Song\u2014Title')).toBe('Song-Title');
    });

    it('should normalize horizontal bar to hyphen', () => {
      // U+2015 ―
      expect(cleanSearchQuery('Song\u2015Title')).toBe('Song-Title');
    });
  });

  describe('zero-width characters', () => {
    it('should remove zero-width space', () => {
      expect(cleanSearchQuery('Hello\u200BWorld')).toBe('HelloWorld');
    });

    it('should remove zero-width non-joiner', () => {
      expect(cleanSearchQuery('Hello\u200CWorld')).toBe('HelloWorld');
    });

    it('should remove zero-width joiner', () => {
      expect(cleanSearchQuery('Hello\u200DWorld')).toBe('HelloWorld');
    });

    it('should remove byte order mark', () => {
      expect(cleanSearchQuery('\uFEFFHello')).toBe('Hello');
    });
  });

  describe('whitespace normalization', () => {
    it('should collapse multiple spaces', () => {
      expect(cleanSearchQuery('Hello    World')).toBe('Hello World');
    });

    it('should trim leading and trailing spaces', () => {
      expect(cleanSearchQuery('  Hello World  ')).toBe('Hello World');
    });
  });

  describe('preserved characters', () => {
    it('should preserve emojis', () => {
      expect(cleanSearchQuery('\u{1F3B5} Song Title \u{1F3B6}')).toBe(
        '\u{1F3B5} Song Title \u{1F3B6}'
      );
    });

    it('should preserve dollar sign (A$AP Rocky)', () => {
      expect(cleanSearchQuery('A$AP Rocky')).toBe('A$AP Rocky');
    });

    it('should preserve ampersand', () => {
      expect(cleanSearchQuery('Simon & Garfunkel')).toBe('Simon & Garfunkel');
    });

    it('should preserve exclamation mark (P!nk)', () => {
      expect(cleanSearchQuery('P!nk')).toBe('P!nk');
    });

    it('should preserve plus sign', () => {
      expect(cleanSearchQuery('Dan + Shay')).toBe('Dan + Shay');
    });

    it('should preserve period (J. Cole)', () => {
      expect(cleanSearchQuery('J. Cole')).toBe('J. Cole');
    });

    it('should preserve standard hyphen (Jay-Z)', () => {
      expect(cleanSearchQuery('Jay-Z')).toBe('Jay-Z');
    });

    it('should preserve accented characters', () => {
      expect(cleanSearchQuery('Beyonc\u00E9')).toBe('Beyonc\u00E9');
      expect(cleanSearchQuery('M\u00F6tley Cr\u00FCe')).toBe('M\u00F6tley Cr\u00FCe');
      expect(cleanSearchQuery('Bj\u00F6rk')).toBe('Bj\u00F6rk');
    });

    it('should preserve standard apostrophe', () => {
      expect(cleanSearchQuery("Don't Stop")).toBe("Don't Stop");
    });
  });

  describe('complex cases', () => {
    it('should handle multiple issues at once', () => {
      // U+201E „ U+201C " U+00B7 ·
      expect(cleanSearchQuery('\u201EHello\u201C \u00B7 World')).toBe('Hello World');
    });

    it('should handle real-world example with multiple special chars', () => {
      // P!nk & Ke$ha U+2013(–) Don't Stop
      expect(cleanSearchQuery("P!nk & Ke$ha \u2013 Don't Stop")).toBe(
        "P!nk & Ke$ha - Don't Stop"
      );
    });

    it('should handle empty string', () => {
      expect(cleanSearchQuery('')).toBe('');
    });

    it('should handle string with only special characters', () => {
      // U+201E „ U+201C " U+00AB « U+00BB »
      expect(cleanSearchQuery('\u201E\u201C\u00AB\u00BB')).toBe('');
    });
  });
});
