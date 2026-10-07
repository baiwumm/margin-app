/**
 * music 块：黑胶风格播放卡（margin Music.astro + music.css 同族）。
 *
 * 数据只有 `{platform, id, audio?}` —— 契约里**没有**歌名/歌手/封面（margin 侧是构建期
 * resolveTrack 抓的，端上拿不到），所以文字区只放平台标签 + 曲库 id，不编造歌名。
 *
 * 能不能播：`audio` 是自托管在同域的 `/audio/<id>.mp3`（实测 200、audio/mpeg、约 2.4MB，
 * 已在域名白名单内）⇒ 用 InnerAudioContext 直接播；没有 audio 或播放出错时按 R4/D8
 * 降级成「复制链接」。同一篇文章里多张卡互斥（margin 用全局音频单例，这里同族做法）。
 */
import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useEffect, useRef, useState } from "react";

import { currentBase } from "@/services/api/manifest";
import type { Block } from "@/types/api";
import "./MusicBlock.scss";

type MusicBlockProps = { block: Extract<Block, { t: "music" }> };

const PLATFORM_LABEL: Record<"netease" | "qq", string> = {
  netease: "网易云音乐",
  qq: "QQ音乐",
};

/** 当前在播的实例（模块级，保证同页只有一张卡在响；margin 用全局音频单例，同族做法） */
let currentCtx: ReturnType<typeof Taro.createInnerAudioContext> | null = null;

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function MusicBlock({ block }: MusicBlockProps) {
  const src = block.audio ? `${currentBase()}${block.audio}` : "";
  const [playing, setPlaying] = useState(false);
  const [now, setNow] = useState(0);
  const [total, setTotal] = useState(0);
  const [broken, setBroken] = useState(!src);
  const ctxRef = useRef<ReturnType<typeof Taro.createInnerAudioContext> | null>(null);

  useEffect(() => {
    if (!src) return undefined;
    const ctx = Taro.createInnerAudioContext();
    ctx.src = src;
    ctx.onPlay(() => setPlaying(true));
    ctx.onPause(() => setPlaying(false));
    ctx.onStop(() => setPlaying(false));
    ctx.onEnded(() => {
      setPlaying(false);
      setNow(0);
    });
    ctx.onTimeUpdate(() => {
      setNow(ctx.currentTime);
      if (ctx.duration) setTotal(ctx.duration);
    });
    ctx.onError(() => {
      setBroken(true);
      setPlaying(false);
    });
    ctxRef.current = ctx;
    return () => {
      if (currentCtx === ctx) currentCtx = null;
      ctx.destroy();
      ctxRef.current = null;
    };
  }, [src]);

  const copySource = () => {
    void Taro.setClipboardData({
      data: src || `https://music.163.com/#/song?id=${block.id}`,
    });
    void Taro.showToast({ title: "已复制歌曲地址", icon: "none" });
  };

  const toggle = () => {
    const ctx = ctxRef.current;
    if (!ctx || broken) {
      copySource();
      return;
    }
    if (playing) {
      ctx.pause();
      return;
    }
    if (currentCtx && currentCtx !== ctx) currentCtx.pause();
    currentCtx = ctx;
    ctx.play();
  };

  const pct = total > 0 ? Math.min(100, Math.round((now / total) * 100)) : 0;

  return (
    <View className={`music-card ${playing ? "music-playing" : ""}`}>
      <View className='music-vinyl'>
        <View className={`music-disc ${playing ? "music-spin" : ""}`}>
          <View className='music-grooves' />
          <View className='music-cover-hole' />
        </View>
      </View>
      <View className='music-body'>
        <View className='music-title-row'>
          <View className='music-titles'>
            <Text className='music-platform'>{PLATFORM_LABEL[block.platform]}</Text>
            <Text className='music-name'>曲库 ID {block.id}</Text>
          </View>
          <View className='music-toggle' hoverClass='row-press' onClick={toggle}>
            <Text className='music-toggle-icon'>{playing ? "❙❙" : "▶"}</Text>
          </View>
        </View>
        <View className='music-progress'>
          <View className='music-progress-fill' style={{ width: `${pct}%` }} />
        </View>
        <View className='music-meta-row'>
          <Text className='music-time'>
            {fmt(now)} / {broken ? "--:--" : fmt(total)}
          </Text>
          <Text className='music-note'>
            {broken ? "暂不可播 · 点左侧复制" : playing ? "正在播放" : "站内播放"}
          </Text>
        </View>
      </View>
    </View>
  );
}
