import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoader } from './helpers/load-typescript.mjs';

test('sanitizer returns empty string during SSR when window is undefined', () => {
  const load = createLoader();
  const { sanitizeExplanationHtml } = load('../../src/lib/sanitizer.ts');
  assert.equal(sanitizeExplanationHtml('<p>Bước 1: Hiểu câu hỏi</p>'), '');
  assert.equal(sanitizeExplanationHtml(null), '');
  assert.equal(sanitizeExplanationHtml(''), '');
});

test('explanation policy allowlist excludes links, images and active attributes', () => {
  const load = createLoader();
  const { ALLOWED_TAGS, ALLOWED_ATTR } = load('../../src/lib/sanitizer.ts');
  
  assert.ok(ALLOWED_TAGS.includes('div'));
  assert.ok(ALLOWED_TAGS.includes('p'));
  assert.ok(ALLOWED_TAGS.includes('strong'));
  assert.ok(ALLOWED_TAGS.includes('table'));
  assert.ok(!ALLOWED_TAGS.includes('script'));
  assert.ok(!ALLOWED_TAGS.includes('iframe'));
  assert.ok(!ALLOWED_TAGS.includes('img'));
  assert.ok(!ALLOWED_TAGS.includes('a'));

  assert.ok(ALLOWED_ATTR.includes('colspan'));
  assert.ok(!ALLOWED_ATTR.includes('onclick'));
  assert.ok(!ALLOWED_ATTR.includes('style'));
  assert.ok(!ALLOWED_ATTR.includes('src'));
});

test('review images permit only audited HTTPS CMS asset URLs', () => {
  const {isReviewImageUrl}=createLoader({URL})('../../src/lib/sanitizer.ts');
  assert.equal(isReviewImageUrl('https://cms.youpass.vn/assets/abc?width=980'),true);
  for (const value of ['http://cms.youpass.vn/assets/a','https://cms.youpass.vn.evil.test/assets/a',
    'https://evil.test/assets/a','https://user:pass@cms.youpass.vn/assets/a','//cms.youpass.vn/assets/a',
    'javascript:alert(1)','data:image/svg+xml,<svg/>','https://cms.youpass.vn/not-an-asset',
    'https://cms.youpass.vn/assets/../admin','https://cms.youpass.vn/assets/']) {
    assert.equal(isReviewImageUrl(value),false,value);
  }
});

test('gap identifiers accept only safe markers for Reading question numbers 1–40', () => {
  const {reviewGapOrder}=createLoader()('../../src/lib/sanitizer.ts');
  for(const [value,expected] of [['q1',1],['question-40',40],['0',null],['q41',null],['q1 onclick=x',null],['<img>1',null],['q',null],[null,null]]) {
    assert.equal(reviewGapOrder(value),expected);
  }
});
