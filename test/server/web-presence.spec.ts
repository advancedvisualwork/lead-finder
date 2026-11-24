import { describe, expect, it } from 'vitest';
import { classifyWebPresence, toInstagramUrl, toSafeHttpUrl } from '../../server/leads/domain/web-presence';

describe('toSafeHttpUrl', () => {
  it('accepts http(s) and bare domains', () => {
    expect(toSafeHttpUrl('https://loja.com.br/x')?.toString()).toBe('https://loja.com.br/x');
    expect(toSafeHttpUrl('loja.com.br')?.toString()).toBe('https://loja.com.br/');
  });

  it.each(['javascript:alert(1)', 'data:text/html,<b>', 'ftp://x.com', 'localhost', 'https://a b.com', ''])(
    'rejects unsafe value %s',
    (value) => {
      expect(toSafeHttpUrl(value)).toBeUndefined();
    },
  );
});

describe('toInstagramUrl', () => {
  it.each([
    ['@padaria.top', 'https://www.instagram.com/padaria.top'],
    ['padaria_top', 'https://www.instagram.com/padaria_top'],
    ['https://instagram.com/padaria', 'https://instagram.com/padaria'],
    ['https://evil.com/instagram.com', ''],
    ['javascript:alert(1)', ''],
  ])('%s -> %s', (raw, expected) => {
    expect(toInstagramUrl(raw)).toBe(expected);
  });
});

describe('classifyWebPresence', () => {
  it('keeps a real website and the Instagram profile separately', () => {
    expect(classifyWebPresence(['https://loja.com.br'], ['@loja'])).toEqual({
      website: 'https://loja.com.br/',
      instagram: 'https://www.instagram.com/loja',
    });
  });

  it('treats an Instagram URL in the website tag as Instagram, not as a site', () => {
    expect(classifyWebPresence(['https://www.instagram.com/loja/'], [])).toEqual({
      website: '',
      instagram: 'https://www.instagram.com/loja/',
    });
  });

  it('never counts social / link-in-bio pages as a website', () => {
    expect(classifyWebPresence(['https://facebook.com/loja', 'https://linktr.ee/loja', 'https://wa.me/5519999'], [])).toEqual({
      website: '',
      instagram: '',
    });
  });
});
