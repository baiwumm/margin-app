/**
 * 检索纯函数（M4 步 7；D15 双层索引端上侧。零 Taro 依赖，可单测；线上实证的
 * 契约形状见 types/api.ts 的 SearchTitlesPayload/SearchTermsPayload 注释）。
 *
 * 双层合并口径：titles 层（标题/标签/摘要/小标题 + 拼音）是质量信号主权重；
 * terms 层（含正文 body 的全文倒排）负责「标题区没写但正文写了」的召回，
 * 分数归一后以小权重并入。查询 < termsMinChars（=2）只走 titles 层。
 * 拼音层 = ASCII 查询对预烘全拼串的前缀/包含命中（中文查询不经拼音——端上
 * 没有汉字转拼音能力，也不需要：中文直接命中原字段）。
 */
import type {
  SearchTitleDoc,
  SearchTermsPayload,
} from "@/types/api";

/** 字段权重（title > tags > headings > desc；pinyin 单列，供标识与加权） */
const FIELD_WEIGHTS = { title: 4, tags: 3, headings: 2, desc: 1, pinyin: 2 } as const;
/** terms 层（正文召回）分数封顶后并入的权重——质量信号不让位给词频 */
const BODY_WEIGHT = 2;
const BODY_SCORE_CAP = 10;

export interface TitleHit {
  doc: SearchTitleDoc;
  /** docs 数组下标（terms 层 docId 与它对齐） */
  index: number;
  score: number;
  /** 拼音层命中（UI 出标识） */
  viaPinyin: boolean;
}

export interface SearchResult extends TitleHit {
  /** 仅 terms 层命中（正文有、标题区没有） */
  viaBody: boolean;
}

/** 查询规范化：去首尾空白 + 小写。返回空串 = 无效查询 */
export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase();
}

const isCJK = (ch: string) => /[\u4e00-\u9fff]/.test(ch);

/**
 * 查询切词（margin bigram 同策略）：连续 CJK 段落滑窗切 bigram（奇数长末尾留
 * 单字），连续 ASCII 段落整词保留；空白是段分隔符、不进 token。
 * 例："微信小程序" → ["微信","信小","程序"]；"微信 abc" → ["微信","abc"]
 */
export function queryTokens(q: string): string[] {
  const norm = normalizeQuery(q);
  if (!norm) return [];
  const tokens: string[] = [];
  let run = "";
  let runCJK = false;
  const flush = () => {
    if (!run) return;
    if (runCJK) {
      for (let i = 0; i < run.length - 1; i++) tokens.push(run.slice(i, i + 2));
      if (run.length === 1) tokens.push(run);
    } else {
      tokens.push(run);
    }
    run = "";
  };
  for (const ch of norm) {
    if (/\s/.test(ch)) {
      flush();
      continue;
    }
    const cjk = isCJK(ch);
    if (run && cjk !== runCJK) flush();
    run += ch;
    runCJK = cjk;
  }
  flush();
  return tokens;
}

/** 单 token 是否命中某字段（包含语义，大小写已在规范化阶段处理） */
const contains = (hay: string, token: string) => hay.toLowerCase().includes(token);

/**
 * titles 层匹配：全部 token 命中（AND）才收，字段加权求和，按分数降序稳定排序
 * （同分按 docs 原序）。viaPinyin = 拼音层为命中所**必需**（某 token 只在拼音串
 * 里出现、文本字段没有）——直接命中文本的文档不标拼音，避免误导。
 */
export function searchTitles(query: string, docs: SearchTitleDoc[]): TitleHit[] {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return [];
  const hits: TitleHit[] = [];
  docs.forEach((doc, index) => {
    const textHay: Record<string, string> = {
      title: doc.title,
      tags: doc.tags.join(" "),
      headings: doc.headings.join(" "),
      desc: doc.desc,
    };
    let score = 0;
    let viaPinyin = false;
    for (const token of tokens) {
      let best = 0;
      for (const [name, hay] of Object.entries(textHay)) {
        if (contains(hay, token)) {
          best = Math.max(
            best,
            FIELD_WEIGHTS[name as keyof typeof FIELD_WEIGHTS]
          );
        }
      }
      let pinyinNecessary = false;
      if (!isCJK(token[0]) && contains(doc.pinyin, token)) {
        if (best === 0) pinyinNecessary = true;
        best = Math.max(best, FIELD_WEIGHTS.pinyin);
      }
      if (best === 0) return; // AND 失败（forEach 的 return = continue）
      score += best;
      if (pinyinNecessary) viaPinyin = true;
    }
    hits.push({ doc, index, score, viaPinyin });
  });
  return hits.sort((a, b) => b.score - a.score || a.index - b.index);
}

/** postings 解析："0:3,7:1" → [[0,3],[7,1]]（容错：空串/缺权重按 0 处理） */
export function parsePostings(s: string): [number, number][] {
  if (!s) return [];
  const out: [number, number][] = [];
  for (const part of s.split(",")) {
    const [id, w] = part.split(":");
    const docId = parseInt(id, 10);
    if (Number.isNaN(docId)) continue;
    out.push([docId, parseInt(w, 10) || 0]);
  }
  return out;
}

/**
 * terms 层查询：token 查倒排 → docId 聚合 Σweight × 覆盖率（该 doc 命中的
 * token 数 / 查询里在索引中存在的 token 数）。OR 召回 + 覆盖率排序：全命中
 * 的文档自然排前，避免 AND 的零结果悬崖（body 里缺一个 bigram 就全无）。
 */
export function searchTerms(
  query: string,
  termsIndex: SearchTermsPayload["terms"]
): Map<number, number> {
  const tokens = queryTokens(query);
  const scores = new Map<number, number>();
  if (tokens.length === 0) return scores;
  const sums = new Map<number, number>();
  const counts = new Map<number, number>();
  for (const token of tokens) {
    const postings = termsIndex[token];
    if (!postings) continue;
    for (const [docId, w] of parsePostings(postings)) {
      sums.set(docId, (sums.get(docId) ?? 0) + w);
      counts.set(docId, (counts.get(docId) ?? 0) + 1);
    }
  }
  const available = tokens.filter(t => termsIndex[t] !== undefined).length || 1;
  for (const [docId, sum] of sums) {
    scores.set(docId, sum * ((counts.get(docId) ?? 1) / available));
  }
  return scores;
}

/** 双层合并：slug 去重、terms 分数归一封顶后小权重并入、稳定排序（同分按 docs 序） */
export function mergeResults(
  titleHits: TitleHit[],
  termsScores: Map<number, number>,
  docs: SearchTitleDoc[]
): SearchResult[] {
  const bySlug = new Map<string, SearchResult>();
  for (const hit of titleHits) {
    bySlug.set(hit.doc.slug, { ...hit, viaBody: false });
  }
  for (const [docId, raw] of termsScores) {
    const doc = docs[docId];
    if (!doc) continue; // 防御：索引错位时不崩，丢弃
    const bodyScore = Math.min(raw, BODY_SCORE_CAP) * BODY_WEIGHT;
    const existing = bySlug.get(doc.slug);
    if (existing) {
      existing.score += bodyScore;
    } else {
      bySlug.set(doc.slug, {
        doc,
        index: docId,
        score: bodyScore,
        viaPinyin: false,
        viaBody: true,
      });
    }
  }
  return [...bySlug.values()].sort(
    (a, b) => b.score - a.score || a.index - b.index
  );
}

/** 一次查全（搜索页入口）：< termsMinChars 只走 titles 层；terms 层可选传入 */
export function searchAll(
  query: string,
  docs: SearchTitleDoc[],
  termsIndex?: SearchTermsPayload["terms"]
): SearchResult[] {
  const norm = normalizeQuery(query);
  if (!norm) return [];
  const titleHits = searchTitles(norm, docs);
  const cjkOrAsciiLen = norm.length;
  if (!termsIndex || cjkOrAsciiLen < 2) {
    return titleHits.map(h => ({ ...h, viaBody: false }));
  }
  return mergeResults(titleHits, searchTerms(norm, termsIndex), docs);
}

export interface HighlightSegment {
  text: string;
  hit: boolean;
}

/** 高亮分段：扫描 text，任一 token 的出现处切分（大小写不敏感；无命中返回原文单段） */
export function highlightSegments(
  text: string,
  tokens: string[]
): HighlightSegment[] {
  const valid = tokens.filter(t => t.length > 0);
  if (valid.length === 0 || !text) return [{ text, hit: false }];
  const lower = text.toLowerCase();
  const segments: HighlightSegment[] = [];
  let pos = 0;
  while (pos < text.length) {
    let next = -1;
    let nextLen = 0;
    for (const token of valid) {
      const at = lower.indexOf(token, pos);
      if (at !== -1 && (next === -1 || at < next)) {
        next = at;
        nextLen = token.length;
      }
    }
    if (next === -1) break;
    if (next > pos) segments.push({ text: text.slice(pos, next), hit: false });
    segments.push({ text: text.slice(next, next + nextLen), hit: true });
    pos = next + nextLen;
  }
  if (pos < text.length) segments.push({ text: text.slice(pos), hit: false });
  return segments;
}
