import DOMPurify from 'dompurify';

export const ALLOWED_TAGS = [
  'div', 'p', 'span', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
  'blockquote', 'ul', 'ol', 'li', 'table', 'caption', 'colgroup',
  'col', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td'
];

export const ALLOWED_ATTR = [
  'colspan', 'rowspan', 'scope', 'start', 'dir'
];

/** Only the audited Reading diagram asset origin/path; no credentials, data URLs or srcset. */
export function isReviewImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.origin === 'https://cms.youpass.vn' && url.pathname.startsWith('/assets/')
      && url.pathname.length > '/assets/'.length && !url.username && !url.password;
  } catch { return false; }
}

export function reviewGapOrder(value: string | null): number | null {
  if (!value || !/^[a-z\d_-]{1,128}$/i.test(value)) return null;
  const order = Number(value.match(/(\d+)$/)?.[1]);
  return Number.isInteger(order) && order >= 1 && order <= 40 ? order : null;
}

/** No raw HTML fallback when there is no browser DOM. No markup edits after sanitization. */
function sanitize(rawHtml: string | null | undefined, content: boolean, gaps: boolean): string {
  if (!rawHtml || typeof window === 'undefined') return '';
  const purifier = DOMPurify(window);
  if (!purifier.isSupported) return '';

  purifier.addHook('uponSanitizeElement', node => {
    if (!(node instanceof window.Element)) return;
    if (node.tagName === 'IMG' && (!content || !isReviewImageUrl(node.getAttribute('src') ?? ''))) {
      node.remove();
      return;
    }
    const order = gaps && node.tagName === 'SPAN' ? reviewGapOrder(node.getAttribute('data-question-id')) : null;
    node.removeAttribute('id');
    if (order !== null) {
      node.setAttribute('data-question-id', `q${order}`);
      node.setAttribute('id', `review-gap-${order}`);
      node.textContent = ''; // Portal supplies escaped historical answers, not source inputs/HTML.
    } else {
      node.removeAttribute('data-question-id');
    }
  });
  purifier.addHook('uponSanitizeAttribute', (node, event) => {
    const tag = node.nodeName.toLowerCase();
    const { attrName: name, attrValue: value } = event;
    if (name === 'src') event.keepAttr = content && tag === 'img' && isReviewImageUrl(value);
    else if (name === 'alt') event.keepAttr = content && tag === 'img';
    else if (['width', 'height', 'colspan', 'rowspan', 'start'].includes(name)) {
      const tags = name === 'start' ? ['ol'] : ['colspan','rowspan'].includes(name) ? ['td','th'] : ['img','col'];
      event.keepAttr = tags.includes(tag) && /^\d{1,4}$/.test(value) && Number(value) >= 1 && Number(value) <= 4096;
    } else if (name === 'scope') event.keepAttr = tag === 'th' && ['row','col','rowgroup','colgroup'].includes(value);
    else if (name === 'dir') event.keepAttr = ['ltr','rtl'].includes(value);
    else if (name === 'data-question-id' || name === 'id') {
      const order = gaps && tag === 'span' ? reviewGapOrder(node.getAttribute('data-question-id')) : null;
      event.keepAttr = order !== null && value === (name === 'id' ? `review-gap-${order}` : `q${order}`);
    }
  });
  return purifier.sanitize(rawHtml, {
    ALLOWED_TAGS: content ? [...ALLOWED_TAGS, 'img'] : ALLOWED_TAGS,
    ALLOWED_ATTR: [...ALLOWED_ATTR, ...(content ? ['src','alt','width','height'] : []),
      ...(gaps ? ['data-question-id','id'] : [])],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    KEEP_CONTENT: true,
  });
}

/** Explanation policy excludes links, images, style/class/id and arbitrary data attributes. */
export function sanitizeExplanationHtml(rawHtml: string | null | undefined): string {
  return sanitize(rawHtml, false, false);
}
/** Instruction/prompt policy additionally permits audited diagram images. */
export function sanitizeReviewContentHtml(rawHtml: string | null | undefined): string {
  return sanitize(rawHtml, true, false);
}
/** Template policy additionally permits only canonical gap markers/IDs for React portals. */
export function sanitizeReviewGapTemplate(rawHtml: string | null | undefined): string {
  return sanitize(rawHtml, true, true);
}
