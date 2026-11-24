export interface WebPresence {
  website: string;
  instagram: string;
}

const INSTAGRAM_HANDLE = /^@?([A-Za-z0-9._]{1,30})$/;
/** Social/link-in-bio hosts are not a business website: a lead with only these is "sem site". */
const NON_WEBSITE_HOSTS = [
  'instagram.com',
  'facebook.com',
  'fb.com',
  'linktr.ee',
  'wa.me',
  'whatsapp.com',
  'tiktok.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'youtube.com',
];

const hostMatches = (host: string, domain: string): boolean => host === domain || host.endsWith(`.${domain}`);

/** Only absolute http(s) URLs with a dotted host survive (blocks javascript:, data:, etc.). */
export function toSafeHttpUrl(raw: string | undefined): URL | undefined {
  const trimmed = raw?.trim();
  if (!trimmed || /\s/.test(trimmed)) return undefined;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    const isHttp = url.protocol === 'https:' || url.protocol === 'http:';
    return isHttp && url.hostname.includes('.') ? url : undefined;
  } catch {
    return undefined;
  }
}

export function toInstagramUrl(raw: string | undefined): string {
  const handle = raw?.trim().match(INSTAGRAM_HANDLE)?.[1];
  if (handle) return `https://www.instagram.com/${handle}`;
  const url = toSafeHttpUrl(raw);
  return url && hostMatches(url.hostname.toLowerCase(), 'instagram.com') ? url.toString() : '';
}

function isNonWebsiteHost(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  return NON_WEBSITE_HOSTS.some((domain) => hostMatches(host, domain));
}

/** Splits raw website/instagram candidates into a real website and an Instagram profile. */
export function classifyWebPresence(websiteCandidates: (string | undefined)[], instagramCandidates: (string | undefined)[]): WebPresence {
  let website = '';
  let instagram = instagramCandidates.map(toInstagramUrl).find(Boolean) ?? '';
  for (const candidate of websiteCandidates) {
    const url = toSafeHttpUrl(candidate);
    if (!url) continue;
    if (isNonWebsiteHost(url)) {
      instagram ||= toInstagramUrl(url.toString());
    } else if (!website) {
      website = url.toString();
    }
  }
  return { website, instagram };
}
