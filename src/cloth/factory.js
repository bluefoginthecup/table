import { flags } from '../core/config.js';

import { buildRectCloth as buildRectCloth_v1 } from '../builders/buildRectCloth.js';
import { buildRoundCloth as buildRoundCloth_v1 } from '../builders/buildRoundCloth.js';

// v2가 아직 없다면 파일을 만들기 전까지 아래 import 주석 유지해도 됨
let buildRectCloth_v2, buildRoundCloth_v2;
try { ({ buildRectCloth: buildRectCloth_v2 } = await import('../builders_v2/buildRectCloth_v2.js')); } catch {}
try { ({ buildRoundCloth: buildRoundCloth_v2 } = await import('../builders_v2/buildRoundCloth_v2.js')); } catch {}

// 공통 시그니처로 노출
export function buildRectCloth(args) {
  return (flags.engine === 'v2' && buildRectCloth_v2) ? buildRectCloth_v2(args)
                                                      : buildRectCloth_v1(args);
}
export function buildRoundCloth(args) {
  return (flags.engine === 'v2' && buildRoundCloth_v2) ? buildRoundCloth_v2(args)
                                                       : buildRoundCloth_v1(args);
}
