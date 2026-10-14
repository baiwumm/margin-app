/**
 * 项目页（M4 步 4；requirements §6.2 分包 A，对应站点 /projects）。
 * 站点结构：hero（N 个开源项目 / Stars / Forks 徽章）+ ProjectCard 网格
 * （语言点 + 名 + 描述 + topics + stars/forks + 打开钮）。
 * 端上：D8 口径外链只复制；打开动作为「复制地址 + toast」。
 * D66 同步口径：站点 hero 徽章已改「全账号 Stars + 加入 GitHub 时长」
 * （margin 6927f08）——两个值未进 projects.json 契约 ⇒ 端上统计行维持
 * 「N 个开源项目 · 已列项目 Stars/Forks 合计」口径（与站点数字不可比，
 * 记档待定）；卡片 topics 对齐站点「≤3 + +N」。
 */
import { Text, View } from "@tarojs/components";
import Taro, { usePageScroll } from "@tarojs/taro";
import { useEffect, useMemo, useState } from "react";

import PageBackdrop from "@/components/deco/PageBackdrop";
import SubNavBar from "@/components/NavBar/SubNavBar";
import { navAlpha } from "@/components/NavBar/NavBar";
import { getProjects } from "@/services/api/collections";
import { useManifest } from "@/hooks/useManifest";
import { useRootClass } from "@/hooks/useTheme";
import type { ProjectPayload } from "@/types/api";
import { projectsHeroBadges } from "@/utils/projectsHero";
import "./index.scss";

export default function ProjectsPage() {
  const rootCls = useRootClass();
  const { manifest } = useManifest();
  const buildId = manifest?.buildId ?? null;
  const [projects, setProjects] = useState<ProjectPayload[] | null>(null);
  const [alpha, setAlpha] = useState(0);
  usePageScroll(p => setAlpha(navAlpha(p.scrollTop)));

  useEffect(() => {
    if (!buildId) return;
    // 既有 service 回调模式（同 getMoments/getGalleryDetail），不新增 hook
    getProjects(buildId, setProjects);
  }, [buildId]);

  /** hero 徽章（D66：站点新口径 = 全账号 Stars + 加入 GitHub 时长；旧数据自动回退合计口径） */
  const badges = useMemo(
    () => projectsHeroBadges(projects ?? [], new Date()),
    [projects]
  );

  const copy = (url: string) => {
    void Taro.setClipboardData({ data: url });
    void Taro.showToast({ title: "已复制项目地址", icon: "none" });
  };

  return (
    <View className={`page page-bg ${rootCls}`}>
      <PageBackdrop />
      <SubNavBar title='项目' alpha={alpha} />
      <View className='page-body projects'>
        {projects === null ? (
          <Text className='projects-loading'>加载中…</Text>
        ) : (
          <>
            <View className='projects-stats'>
              {badges.map((b, i) => (
                <Text key={b}>
                  {i > 0 ? <Text className='projects-stats-dot'>· </Text> : null}
                  <Text className='projects-stats-text'>{b}</Text>
                </Text>
              ))}
            </View>

            <View className='projects-list'>
              {projects.map(p => (
                <View
                  key={p.url}
                  className='project-card'
                  hoverClass='card-press'
                  hoverStayTime={80}
                  onClick={() => copy(p.url)}
                >
                  <View className='project-head'>
                    {p.lang ? (
                      <View className='project-lang'>
                        <View className='project-lang-dot' />
                        <Text className='project-lang-text'>{p.lang}</Text>
                      </View>
                    ) : null}
                    <View className='project-stars'>
                      <Text className='project-star-text'>★ {p.stars}</Text>
                      <Text className='project-fork-text'>⑂ {p.forks}</Text>
                    </View>
                  </View>
                  <Text className='project-name'>{p.name}</Text>
                  <Text className='project-desc'>{p.desc}</Text>
                  {p.topics.length > 0 ? (
                    <View className='project-topics'>
                      {/* 站点 ProjectCard 口径（D66 同步）：最多 3 个 + “+N” */}
                      {p.topics.slice(0, 3).map(t => (
                        <Text key={t} className='project-topic'>
                          {t}
                        </Text>
                      ))}
                      {p.topics.length > 3 ? (
                        <Text className='project-topic'>+{p.topics.length - 3}</Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>

            {projects.length === 0 ? (
              <View className='empty'>
                <Text className='empty-title'>这里还什么都没有</Text>
                <Text className='empty-desc'>项目正在路上，敬请期待。</Text>
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}
