/**
 * 免责声明页（M4 步 5，D64；文案 = compliance.md §11 初稿按已录倾向落定，
 * 发布前仍需用户过目 —— M4 验收外的合规闸）。
 * 倾向 #1：第七条不写死邮箱（写进包里换邮箱要发版），指向「联系站长」；
 * 倾向 #3：原第六条「不提供新闻采编、出版发布与评论服务」迁往关于页尾部
 * （给审核员看的口径，不混进给用户的声明）。原第七条顺位补为「六」保持
 * 编号连续（compliance 草稿编号不变，端上展示选择）。
 * 写法约束（compliance §11）：双读者、全文不含「资讯/出版/博客/媒体」、
 * 不写「禁止转载」类反向强承诺。
 */
import { Text, View } from "@tarojs/components";
import { usePageScroll } from "@tarojs/taro";
import { useState } from "react";

import PageBackdrop from "@/components/deco/PageBackdrop";
import SubNavBar from "@/components/NavBar/SubNavBar";
import { navAlpha } from "@/components/NavBar/NavBar";
import { useRootClass } from "@/hooks/useTheme";
import "./disclaimer.scss";

interface Section {
  title: string;
  paras: string[];
}

const SECTIONS: Section[] = [
  {
    title: "一、原创与转载",
    paras: [
      "默认情况下，本小程序内的文字与代码示例均为原创。",
      "少数整理、摘录或转述他人的内容，会在该篇正文中注明来源与原文链接。",
    ],
  },
  {
    title: "二、图片与第三方素材",
    paras: [
      "文中图片包括站长自拍或截图、以及为说明技术概念而引用的公开素材。",
      "第三方素材的版权仍归原权利人所有，仅用于说明与学习交流，不作商业用途。",
      "若您认为某处内容侵犯了您的合法权益，请通过下方联系方式告知，核实后会第一时间署名、替换或下架。",
    ],
  },
  {
    title: "三、代码与操作步骤",
    paras: [
      "文章中的代码、配置与命令基于站长写作时的环境与版本整理，技术会随版本演进变化，不保证在所有环境下可直接运行。",
      "生产环境使用前请自行验证。",
    ],
  },
  {
    title: "四、外部链接",
    paras: [
      "文中出现的第三方站点链接仅为方便读者查阅，站长对其内容的准确性与合法性不作担保，也不构成推荐。",
    ],
  },
  {
    title: "五、观点归属",
    paras: ["本小程序内的一切观点仅代表站长个人，与任何组织、雇主或提及的第三方产品无关。"],
  },
  {
    title: "六、联系方式",
    paras: ["如有关于内容授权、勘误或合作的询问，可通过「联系站长」入口找到本人。"],
  },
];

export default function Disclaimer() {
  const rootCls = useRootClass();
  const [alpha, setAlpha] = useState(0);
  usePageScroll(p => setAlpha(navAlpha(p.scrollTop)));

  return (
    <View className={`page page-bg ${rootCls}`}>
      <PageBackdrop />
      <SubNavBar title='免责声明' alpha={alpha} />
      <View className='page-body disclaimer'>
        <View className='disclaimer-card'>
          <Text className='disclaimer-title'>内容声明</Text>
          <Text className='disclaimer-intro'>
            本小程序是个人技术学习笔记的阅读端，内容与 baiwumm.com 同步，由站长本人撰写、整理或摘录，不构成任何专业建议。
          </Text>
          {SECTIONS.map(s => (
            <View key={s.title} className='disclaimer-section'>
              <Text className='disclaimer-section-title'>{s.title}</Text>
              {s.paras.map((p, i) => (
                <Text key={i} className='disclaimer-para'>
                  {p}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
