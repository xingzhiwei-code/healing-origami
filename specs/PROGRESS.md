# PROGRESS · 项目进度活文档

> 项目实时状态。**任何代码推进都必须同步更新本文件**。
> 新会话 AI：本文件 + `git log` + `AGENTS.md` 可在 5 分钟内重建上下文。
> 最近更新：**2026-05-13**

---

## 当前状态

- **当前里程碑**：M1 · 单片段折叠（PaperFragment）
- **正在做**：M1-a · 节点骨架 + Prefab（可在编辑器里拖出一张静态纸片）
- **下一步**：M1-b · 用代码控制纸片绕 Y 轴翻 180°（先固定动画，不接手指）

---

## 里程碑追踪

> 子任务用 `[ ]` 未开始 / `[WIP]` 进行中 / `[DONE YYYY-MM-DD]` 完成。

### M0 · 触摸链路验证 [DONE 2026-05-13]

- [DONE 2026-05-13] `FoldController.ts` 调试版打通触摸事件链路

### M1 · 单片段折叠 [WIP]

- [WIP] M1-a 节点骨架 + Prefab，编辑器内可见一张静态纸片
- [ ] M1-b 代码控制纸片绕 Y 轴翻 180°（固定动画）
- [ ] M1-c 加 `tween` 缓动，引用 `Duration.fold` 与 `ease-fold`
- [ ] M1-d `update` 内 Z 切换（过 90° 翻面），遵守「禁分配」纪律
- [ ] M1-e 正反面双 Sprite + UV（FrontSprite 用片段图，BackSprite 用完整图镜像 UV）
- [ ] M1-f `PaperFragment` 完整对外 API（`init` / `setAngle` / `commitFold` / `revertFold`）

### M2 · 关卡数据 + 单关跑通 [TODO]

### M3 · FoldOrderResolver 多片段 Z 切换与穿模检测 [TODO]

### M4 · WinChecker + CelebrateView [TODO]

### M5 · DesignTokens.ts + HUD + Journal（仅展示） [TODO]

### M6 · 平台适配（platform/ 抽象 + 微信 + Native + H5） [TODO]

### M7 · 关卡编辑器 + 折叠回放 [TODO]

---

## 决策记录（Decision Log）

> 按时间倒序，**最新在上**。记录每次重要决策的「时间 / 决策 / 原因」。
> 决策一旦写入，**不要修改已有行**（决策应有不可变性，如要变更请追加新行说明覆盖关系）。

| 日期 | 决策 | 原因 |
|---|---|---|
| 2026-05-13 | 建立 `AGENTS.md` + `specs/PROGRESS.md` 双文档作为 AI 跨会话记忆机制 | 单上下文有限，需要项目自描述能力 |
| 2026-05-13 | 主目标微信小游戏，次目标 iOS / Android Native + H5 | 用户希望跨平台 |
| 2026-05-13 | 继续使用 Cocos Creator 3.8.8 | 微信支持最完善 + 编辑器加速关卡制作 + 已踩过的坑成本沉没 |
| 2026-05-13 | M1 拆为 6 个子步骤（M1-a ~ M1-f），每步对应一个 Cocos 概念 | 用户希望边做边学 |
| 2026-05-13 | 渲染方案放弃 `Mask(Polygon)`，改预切 PNG + 双 Sprite 正反面 | 微信对 Stencil 调用敏感 + 正反面叙事 |
| 2026-05-13 | 不复用 Gemini 原始 PRD，重写为「治愈手作」版本 | 原 PRD 忽略正反面叙事 / Mask 性能 / 手指连续控制 |
| 2026-05-13 | 沉淀 `specs/game-logic.md` + `specs/system-arch.md` 作为项目宪法 | 防止后续讨论反复 |
| 2026-05-13 | 沉淀 `specs/ui-design.md` Design Tokens 体系 | UI 单一来源，避免代码裸字面量 |

---

## 未解决问题（Open Questions）

- **Q1**：M7 关卡编辑器走 Cocos 自定义 Editor 扩展还是独立 Node CLI？等做到 M5 再决定。
- **Q2**：v2 立体折纸（章节 4）的技术可行性，需要在 M4 完成后做一次原型验证。
- **Q3**：M1-e 正反面 UV 镜像具体公式（关于背面 sprite 的 UV.x = 1 - UV.x 还是 frontRect 的镜像），等 M1-d 完成后实测确认。
- **Q4**：微信小游戏 30 FPS 锁帧是否需要在 iOS Native 也保持？还是 Native 解锁到 60？M6 实测后决定。

---

## 当前会话上下文摘要（给下一次新会话）

项目刚完成 PRD 与架构沉淀阶段，产出物：

1. `.cursorrules`：工程宪法。
2. `specs/ui-design.md`：完整 Design Tokens 体系（v0.1）。
3. `specs/game-logic.md`：玩法规范（v0.1，今日新增）。
4. `specs/system-arch.md`：架构规范（v0.1，今日新增，已含跨平台 §6）。
5. `AGENTS.md` + `specs/PROGRESS.md`：AI 协作机制（今日新增）。

用户已认可：
- Paper Fold 类玩法 + 治愈叙事（区别于 Voodoo 原版）；
- 继续 Cocos 3.8，跨平台投放；
- 边做边学，每个里程碑拆 4–6 个子步骤。

代码层面只完成了 M0（`FoldController.ts` 调试版打通触摸事件链路）。
下一步从 M1-a 开始：在 `assets/scripts/core/` 下创建 `PaperFragment.ts` 骨架，并在编辑器里做出一个可拖入的 Prefab，能看到一张静态纸片。

---

## 版本

- v0.1（2026-05-13）初版，建立进度追踪机制。
