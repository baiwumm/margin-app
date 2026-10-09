/**
 * 瞬间自托管 mp4 的原生内嵌播放（D52 新排单元，步 9 之后）。
 * 站点口径（margin video.css + MomentCard.astro）：玻璃卡 + 16/9 近黑画面区 +
 * 播放态 accent 描边；站点自绘控制条（播放/进度/静音/全屏）是 web-only，端上按
 * D52 走原生 `<video controls>`（官方控件自带播放/进度/全屏，暗色随系统）。
 *
 * 边界（与 VideoCard 的分工）：
 *  · src 是站内相对路径或同 assetBase 的绝对地址（自托管）⇒ 这里内嵌播放；
 *  · 其余（B 站 BV 等外链）仍走 VideoCard 降级引用卡（D8 无 web-view，D51 拍板 B）；
 *  · 播放出错（域名未配 / 资源 404）⇒ 同样回退 VideoCard，保留 D8 降级精神。
 * 生命周期「离开页面停播」两条腿：autoPauseIfNavigate（默认开）管导航态
 * （switchTab / navigateTo 都会触发）；页面 onHide（app 后台）由页面调
 * pauseMomentVideo() 兜底（模块级单例，同 MusicBlock 的 currentCtx 做法）。
 * 注：id 固定 moment-video —— 单页只容许一个瞬间视频在播（语料 9 条仅 1 条带），
 * 多视频同页时 createVideoContext 只操作得到第一个，与「同时只响一个」的约束同向。
 */
import { Text, Video, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useEffect, useState } from "react";

import { VideoCard } from "@/components/block/LinkCardBlock";
import { frameRatio, selfHostedVideoSrc } from "@/utils/momentVideo";
import "./MomentVideo.scss";

/** 瞬间 video 字段（契约 Moment.video，与正文 video 块同形少一个 t 判别位） */
export type MomentVideoLike = {
  id?: string;
  src?: string;
  poster?: string;
  title?: string;
  ratio?: string;
};

/** 页面 onHide 时的兜底暂停（只操作当前在播的那个 video context）。
 *  ⚠️ autoPauseIfNavigate 暂停时**不一定发 onPause 事件**（探针三次复测里两次
 *  playing 类没归位 ⇒ 态会说谎），所以这里 pause() 之后直接把 React 态归位，
 *  不依赖事件链时序（探针证据见 D56）。 */
let activeCtx: ReturnType<typeof Taro.createVideoContext> | null = null;
let activeSetPlaying: ((playing: boolean) => void) | null = null;

export function pauseMomentVideo(): void {
  activeCtx?.pause();
  activeSetPlaying?.(false);
}

export default function MomentVideo({ video }: { video: MomentVideoLike }) {
  const src = selfHostedVideoSrc(video.src);
  const [playing, setPlaying] = useState(false);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (!src) return undefined;
    const ctx = Taro.createVideoContext("moment-video");
    activeCtx = ctx;
    activeSetPlaying = setPlaying;
    return () => {
      if (activeCtx === ctx) activeCtx = null;
      if (activeSetPlaying === setPlaying) activeSetPlaying = null;
    };
  }, [src]);

  // 非自托管或播放出错 ⇒ 降级引用卡（D8/D52）
  if (!src || broken) return <VideoCard block={video} />;

  return (
    <View className={`moment-video ${playing ? "moment-video-playing" : ""}`}>
      {video.title ? (
        <View className='moment-video-head'>
          <Text className='moment-video-tag'>VIDEO</Text>
          <Text className='moment-video-name'>{video.title}</Text>
        </View>
      ) : null}
      <View className='moment-video-frame' style={{ aspectRatio: frameRatio(video.ratio) }}>
        <Video
          id='moment-video'
          className='moment-video-el'
          src={src}
          poster={video.poster}
          controls
          showCenterPlayBtn
          objectFit='contain'
          autoPauseIfNavigate
          enablePlayGesture
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => setBroken(true)}
        />
      </View>
    </View>
  );
}
