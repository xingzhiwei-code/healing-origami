# PROGRESS · 项目进度活文档

> 项目实时状态。**任何代码推进都必须同步更新本文件**。
> 新会话 AI：本文件 + `git log` + `AGENTS.md` 可在 5 分钟内重建上下文。
> 最近更新：**2026-05-14**

---

## 当前状态

- **当前里程碑**：M1 · 单片段折叠（PaperFragment）
- **正在做**：M1-e · 正反面 UV / 贴图（Front 片段图 + Back 大图 rect / 镜像）
- **下一步**：M1-f · `init` / `commitFold` / `revertFold` 等完整对外 API

---

## 里程碑追踪

> 子任务用 `[ ]` 未开始 / `[WIP]` 进行中 / `[DONE YYYY-MM-DD]` 完成。

### M0 · 触摸链路验证 [DONE 2026-05-13]

- [DONE 2026-05-13] `FoldController.ts` 调试版打通触摸事件链路

### M1 · 单片段折叠 [WIP]

- [DONE 2026-05-13] M1-a 节点骨架 + Prefab，编辑器内可见一张静态纸片
- [DONE 2026-05-14] M1-b `setFoldAngle(degY)` 驱动 `pivot.eulerAngles.y`，`_tmpEuler` 复用；0°/90°/120° 预览与 Pivot 子树验证通过
- [DONE 2026-05-14] M1-c：`tweenFoldTo` + `MotionEasing.ts`（`duration-fold` 600 ms + `ease-fold` bezier）；`debugAutoTweenFold180` 编辑器验收通过
- [DONE 2026-05-14] M1-d `update` 内 sibling 切换（`|y|>90` Back 置顶，`|y|<90` Front 置顶）；越 90° tween 无错误遮挡；`onLoad` 缓存 `_pivotNode/_frontNode/_backNode`
- [ ] M1-e 正反面双 Sprite + UV（FrontSprite 用片段图，BackSprite 用完整图镜像 UV）
- [ ] M1-f `PaperFragment` 完整对外 API（`init` / `commitFold` / `revertFold` 等）

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
| 2026-05-14 | M1-d：以 pivot 绕本地 Y 的转角绝对值与 90° 开区间切换 Pivot 下子节点 `setSiblingIndex(last)`；不在 `update` 内 `getComponent` | 翻面后须让朝外一侧后绘，避免穿模；与子节点仅 Front/Back 的 Prefab 约定一致 |
| 2026-05-14 | M1-c：`ease-fold` 用 CSS cubic-bezier 逆解映射到 Cocos `Tween` 的 `easing(k)`；时长/曲线暂放在 `MotionEasing.ts`，M5 与 `DesignTokens` 对齐 | 引擎内置字符串 easing 无该 bezier；避免与设计 Token 漂移 |
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

- **M1-d 已合并**：用户预览确认 0→180° tween 过 90° 时 sibling 切换无错误遮挡。
- **下一里程碑 M1-e**：为 `FrontSprite` / `BackSprite` 设置 `SpriteFrame` 的 rect（或与预切图策略一致）；背面展示「大图」上对应 UV，使折过去后图案连贯；顺带收敛 Q3。
- **提醒**：`debugAutoTweenFold180` 默认关闭。

协作纪律提醒：推进结束必更新本文件；新增事件先注册 `GameEvents`；不主动创建 `.meta` / 不动 `temp/library/profiles/settings/`。

---

## 版本

- v0.1（2026-05-13）初版，建立进度追踪机制。
- v0.2（2026-05-14）同步 M1-b 完成与 M1-c 起点。
- v0.3（2026-05-14）同步 M1-c 实现落位与验收步骤。
- v0.4（2026-05-14）M1-c 验收通过，进入 M1-d。
- v0.5（2026-05-14）M1-d 实现落位（sibling 切换），待预览验收。
- v0.6（2026-05-14）M1-d 验收通过，进入 M1-e。
