# Healing Origami · UI 设计规范 / Design Tokens

> 作用域：本文件是项目所有 UI 视觉决策的唯一来源（Single Source of Truth）。
> 代码侧通过 `assets/scripts/ui/DesignTokens.ts` 1:1 映射本文件常量；
> 修改 Token 必须同时改本文件 + 常量文件，并在 PR 描述中说明动机。

---

## 0. 设计哲学

**「茶歇时光，纸上修补」**

- **手作纸张**：背景永远是温暖的米色或奶白，模拟原浆纸的微粒质感；杜绝纯白与纯黑。
- **折痕肌理**：可见的折线、留白、不对称构图，呼应折纸的几何感与脆弱感。
- **低饱和暖色**：主色取自茶汤、陶土、麻布；避免高饱和、霓虹、紫色渐变。
- **慢节奏动效**：折纸翻转、缓入缓出，让玩家放下急躁，专注于「把一张纸抚平」。
- **大留白**：内容密度低于普通休闲游戏 30%，让画面「能呼吸」。

参考关键词：日系手帐 / wabi-sabi / Klee One 字体 / 谷川俊太郎诗集装帧 / 茑屋书店宣传册。

---

## 1. Color Tokens

> 命名约定：`{家族}-{深浅刻度}`。刻度参照 Tailwind（50 最浅，900 最深），但色值是手工调过的暖色版本，**不要用 Tailwind 默认值替换**。

### 1.1 纸张背景（Paper）

用于全屏底色、卡片底色、弹窗底色。

| Token | HEX | 用途 |
|---|---|---|
| `paper-0` | `#FFFFFF` | 几乎不用，仅在需要纯白文字反衬时使用 |
| `paper-50` | `#FAF6F0` | **主背景**，全屏底色 |
| `paper-100` | `#F2EAD8` | 次级背景、卡片底色 |
| `paper-200` | `#E8DCC2` | 选中态卡片、分组背景 |
| `paper-300` | `#D9C8A6` | 分割线、弱边框 |

### 1.2 主色：茶绿（Sage）

折纸主体、主按钮、关键路径强调。

| Token | HEX | 用途 |
|---|---|---|
| `sage-100` | `#E2ECDE` | 主色 hover 弱态、徽章底色 |
| `sage-300` | `#A8C3A1` | **次级主色**，轻量按钮 |
| `sage-500` | `#7FA37A` | **主按钮默认态** |
| `sage-700` | `#567A56` | 按下态、深色背景上的图标 |

### 1.3 强调色：陶土（Clay）

CTA、奖励、爱心 / 关注、亮点提示。

| Token | HEX | 用途 |
|---|---|---|
| `clay-100` | `#F6E3D8` | 高亮卡片底色 |
| `clay-300` | `#E8C5B6` | **强调元素默认态** |
| `clay-500` | `#D9A38B` | 强调按钮、奖励图标 |
| `clay-700` | `#A86F5A` | 强调按钮按下、徽章描边 |

### 1.4 辅助色（Auxiliary）

按需调味，禁止滥用。一个界面最多出现 2 种辅助色。

| Token | HEX | 印象 |
|---|---|---|
| `mist-300` | `#B5C7D3` | 雾蓝，安静 / 提示 |
| `mist-500` | `#7E97A5` | 雾蓝深，链接 |
| `wheat-300` | `#E6D194` | 麦黄，星星 / 时间 |
| `wheat-500` | `#C9A845` | 金币、稀有度 |
| `lotus-300` | `#E8C8CC` | 淡藕粉，限时活动 |
| `lotus-500` | `#C28991` | 藕粉深，活动按钮 |

### 1.5 中性墨色（Ink）

文字、图标、描边。**所有文字必须从这一组中取色，禁止使用纯黑。**

| Token | HEX | 用途 |
|---|---|---|
| `ink-900` | `#3D332B` | **正文主色**、标题 |
| `ink-700` | `#564A40` | 副文本 |
| `ink-600` | `#6E6258` | 提示文字、次级图标 |
| `ink-400` | `#9E9489` | 禁用态文字 |
| `ink-300` | `#C9C0B4` | 占位符、装饰线 |
| `ink-100` | `#E9E2D6` | 极弱描边 |

### 1.6 语义色（Semantic）

仅用于反馈，不参与装饰。

| Token | HEX | 含义 |
|---|---|---|
| `success` | `#9CB97D` | 通关、保存成功 |
| `warning` | `#E0B161` | 时间将尽、低血量 |
| `error` | `#C97A6E` | 失败、不可操作 |
| `info` | `#9DB6C5` | 中性提示 |

> 语义色禁止用作品牌色或大面积底色。

---

## 2. Typography Tokens

### 2.1 字族（Font Family）

| Token | Stack | 用途 |
|---|---|---|
| `font-display` | `'Klee One', '方正手迹简体', '字魂萌趣手书', 'LXGW WenKai', serif` | 大标题、关卡名、奖励数字 |
| `font-body` | `'LXGW WenKai', 'Source Han Serif SC', '思源宋体', serif` | 正文、说明、按钮文字 |
| `font-mono` | `'JetBrains Mono', 'Menlo', monospace` | 调试 HUD、版本号 |

> 显示字优先使用「Klee One」（Google Fonts 开源），它的圆润手写感与折纸主题契合；
> 业务上线前需在微信小游戏后台配置 bitmap 字体子集化，正文字体仅打包常用 4000 字。

### 2.2 字号阶（Font Size）

单位：逻辑像素（Cocos 设计分辨率 720×1280 下的 px）。

| Token | px | 用途 |
|---|---|---|
| `text-xs` | 12 | 角标、版本号 |
| `text-sm` | 14 | 说明文字、提示 |
| `text-base` | 16 | **正文默认** |
| `text-md` | 18 | 列表标题 |
| `text-lg` | 20 | 卡片标题 |
| `text-xl` | 24 | 弹窗标题 |
| `text-2xl` | 32 | 关卡名、章节名 |
| `text-3xl` | 40 | 大标题、胜利结算 |
| `text-4xl` | 56 | 奖励数字爆点 |

### 2.3 字重（Font Weight）

手写体字族通常只有 `Regular`，禁止 fake bold；如需强调用「加大字号 + 加重颜色」或 `font-display` 替换。

| Token | Weight | 备注 |
|---|---|---|
| `weight-regular` | 400 | 默认 |
| `weight-bold` | 700 | 仅在 `font-mono` / 系统字回落场景使用 |

### 2.4 行高 / 字间距

| Token | 值 | 用途 |
|---|---|---|
| `leading-tight` | 1.25 | 大标题 |
| `leading-normal` | 1.5 | **正文默认** |
| `leading-loose` | 1.75 | 长段落、说明书 |
| `tracking-tight` | -0.01em | 大标题 |
| `tracking-normal` | 0 | 默认 |
| `tracking-wide` | 0.05em | 按钮文字、章节副标题 |

---

## 3. Spacing Tokens

基础单位 **4 px**，所有间距必须从下表取值。禁止出现 `5 / 7 / 13 / 18` 等中间值。

| Token | px | 典型用途 |
|---|---|---|
| `space-1` | 4 | 图标内 padding |
| `space-2` | 8 | 紧凑组件间距 |
| `space-3` | 12 | 按钮内 padding-y |
| `space-4` | 16 | **默认间距** |
| `space-5` | 24 | 卡片 padding |
| `space-6` | 32 | 区块间距 |
| `space-7` | 48 | 大区块间距、安全区边距 |
| `space-8` | 64 | 全屏关卡选择网格间距 |
| `space-9` | 96 | 启动页留白 |

---

## 4. Radius Tokens

折角感来自「不规则圆角」与「不对称圆角」组合。

| Token | px | 用途 |
|---|---|---|
| `radius-none` | 0 | 全屏背景 |
| `radius-sm` | 6 | 角标、徽章 |
| `radius-md` | 12 | **默认按钮、输入框** |
| `radius-lg` | 20 | 卡片、弹窗 |
| `radius-xl` | 32 | 大型展示卡片、奖励弹窗 |
| `radius-full` | 9999 | 头像、圆形按钮 |

特殊：折纸卡片可使用「不对称圆角」，例如 `radius-lg / radius-sm / radius-lg / radius-sm`，表达折角。

---

## 5. Shadow Tokens

阴影统一带暖色调（基于 `ink-900` 的 alpha），**禁止使用纯黑阴影**。

| Token | 值 | 用途 |
|---|---|---|
| `shadow-paper-soft` | `0 2px 8px rgba(60, 52, 44, 0.08)` | 卡片默认 |
| `shadow-paper-lift` | `0 8px 24px rgba(60, 52, 44, 0.12)` | 悬浮态、弹窗 |
| `shadow-paper-deep` | `0 16px 48px rgba(60, 52, 44, 0.18)` | 关键弹窗 / 模态背后 |
| `shadow-inset-fold` | `inset 0 -2px 0 rgba(60, 52, 44, 0.06)` | 折痕暗示（卡片底边） |

---

## 6. Motion Tokens

慢节奏是核心体验，**默认时长高于普通游戏**。

| Token | 值 | 用途 |
|---|---|---|
| `ease-paper` | `cubic-bezier(0.4, 0, 0.2, 1)` | **默认缓动** |
| `ease-fold` | `cubic-bezier(0.65, 0, 0.35, 1)` | 折纸翻转 |
| `ease-bounce-soft` | `cubic-bezier(0.34, 1.3, 0.64, 1)` | 奖励弹出（轻微回弹） |
| `duration-instant` | 80 ms | 按钮按下反馈 |
| `duration-fast` | 160 ms | 状态切换 |
| `duration-base` | 240 ms | **UI 默认渐入** |
| `duration-slow` | 400 ms | 弹窗进出 |
| `duration-fold` | 600 ms | 折纸翻转 |
| `duration-celebrate` | 1200 ms | 通关结算大动效 |

约束：单屏同时进行的动画不超过 3 条；超过的合并为一条统筹动画。

---

## 7. Elevation / Z-Index Tokens

| Token | 值 | 层 |
|---|---|---|
| `z-base` | 0 | 关卡场景 |
| `z-hud` | 100 | 顶部血量 / 计时 |
| `z-panel` | 200 | 一般 UI 面板 |
| `z-modal` | 500 | 模态弹窗 |
| `z-toast` | 700 | Toast / 提示气泡 |
| `z-overlay` | 900 | 引导遮罩 |
| `z-debug` | 9999 | 调试 HUD |

---

## 8. 与代码的映射

未来生成 `assets/scripts/ui/DesignTokens.ts` 时，导出名必须严格对齐本文档 Token 名，示例：

```ts
export const Color = {
    paper50: '#FAF6F0',
    paper100: '#F2EAD8',
    sage500: '#7FA37A',
    clay500: '#D9A38B',
    ink900: '#3D332B',
    success: '#9CB97D',
} as const;

export const Spacing = {
    s1: 4, s2: 8, s3: 12, s4: 16, s5: 24, s6: 32, s7: 48, s8: 64, s9: 96,
} as const;

export const Radius = {
    sm: 6, md: 12, lg: 20, xl: 32, full: 9999,
} as const;

export const Duration = {
    instant: 80, fast: 160, base: 240, slow: 400, fold: 600, celebrate: 1200,
} as const;
```

> 业务代码引用：`import { Color, Spacing } from '../ui/DesignTokens';`
> 禁止在 UI 脚本里写裸字面量颜色 / 数字。

---

## 9. 反例（禁止）

- `#FFFFFF` / `#000000` 大面积铺底
- 紫色渐变（`#A78BFA → #EC4899` 一类）
- Inter / Roboto / 默认系统字
- 圆角 `8 / 10 / 16`（非阶梯值）
- 阴影 `rgba(0, 0, 0, 0.x)`（黑色而非暖墨）
- 动效 `duration < 80ms` 的「闪烁感」反馈
- 同屏 4 个以上颜色家族

---

## 10. 版本

- v0.1（2026-05-13）初版，基于「治愈手作」语义建立完整 Token 集。
