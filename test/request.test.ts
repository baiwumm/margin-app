import { beforeEach, describe, expect, it } from "vitest";

import {
  LocalError,
  LocalErrorKind,
} from "@/services/errors";
import { setPlatformAdapter } from "@/services/platform";
import { getJson } from "@/services/request";
import { resetMemoryCache } from "@/services/cache";
import { MockPlatform } from "./helpers/mock-platform.ts";

let mp: MockPlatform;

beforeEach(() => {
  mp = new MockPlatform();
  setPlatformAdapter(mp.adapter);
  resetMemoryCache();
});

describe("request.getJson", () => {
  const URL = "https://www.baiwumm.com/api/v1/site.json";

  it("200 + 合法 Envelope → 返回 data 与 etag", async () => {
    mp.json(URL, mp.envelope({ title: "Margin" }), '"v1"');
    const res = await getJson<{ title: string }>(URL);
    expect("notModified" in res).toBe(false);
    if (!("notModified" in res)) {
      expect(res.envelope.data.title).toBe("Margin");
      expect(res.etag).toBe('"v1"');
    }
  });

  it("HTTP 500 → LocalError(Http)，不重试", async () => {
    mp.route(URL, () => ({ statusCode: 500, data: "", header: {} }));
    await expect(getJson(URL)).rejects.toMatchObject({
      kind: LocalErrorKind.Http,
      statusCode: 500,
    });
    expect(mp.requestLog.length).toBe(1);
  });

  it("网络失败 → 重试 1 次后仍抛 Network", async () => {
    mp.route(URL, () => new Error("timeout"));
    await expect(getJson(URL)).rejects.toMatchObject({
      kind: LocalErrorKind.Network,
    });
    expect(mp.requestLog.length).toBe(2); // 1 次原始 + 1 次重试
  });

  it("JSON 解析失败 → LocalError(Parse)", async () => {
    mp.route(URL, () => ({ statusCode: 200, data: "<html>", header: {} }));
    await expect(getJson(URL)).rejects.toMatchObject({
      kind: LocalErrorKind.Parse,
    });
  });

  it("schemaVersion 不认识 → LocalError(Schema)（D24 软降级信号）", async () => {
    mp.json(URL, mp.envelope({}, "b1", 99));
    await expect(getJson(URL)).rejects.toMatchObject({
      kind: LocalErrorKind.Schema,
    });
  });

  it("响应超 400KB → LocalError(Budget)", async () => {
    const big = "x".repeat(401 * 1024);
    mp.route(URL, () => ({ statusCode: 200, data: big, header: {} }));
    await expect(getJson(URL)).rejects.toMatchObject({
      kind: LocalErrorKind.Budget,
    });
  });

  it("带 If-None-Match 且服务端 304 → notModified", async () => {
    mp.route(URL, opts => {
      if (opts.header?.["If-None-Match"] === '"v1"') {
        return { statusCode: 304, data: "", header: {} };
      }
      return { statusCode: 200, data: JSON.stringify(mp.envelope({})), header: { etag: '"v1"' } };
    });
    const first = await getJson(URL);
    if ("notModified" in first) throw new Error("first should be 200");
    const second = await getJson(URL, { etag: first.etag });
    expect("notModified" in second).toBe(true);
  });

  it("并发去重：同 URL 飞行中共享同一 Promise", async () => {
    let resolveCount = 0;
    mp.route(URL, async () => {
      resolveCount++;
      await new Promise(r => setTimeout(r, 20));
      return { statusCode: 200, data: JSON.stringify(mp.envelope({})), header: {} };
    });
    const [a, b] = await Promise.all([getJson(URL), getJson(URL)]);
    expect(resolveCount).toBe(1);
    expect(a).toBe(b); // 同一 Promise 实例
  });

  it("LocalError kind 覆盖全枚举", () => {
    for (const kind of Object.values(LocalErrorKind)) {
      const e = new LocalError(kind, "x");
      expect(e.kind).toBe(kind);
    }
  });
});
