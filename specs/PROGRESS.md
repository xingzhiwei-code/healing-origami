# PROGRESS · 项目进度活文档

> 项目实时状态。**任何代码推进都必须同步更新本文件**。
> 新会话 AI：本文件 + `git log` + `AGENTS.md` 可在 5 分钟内重建上下文。
> 最近更新：**2026-05-14**

---

## 当前状态

- **当前里程碑**：M2 · 关卡数据 + 单关 hardcode 跑通
- **正在做**：M2-b · 清理诊断日志 + 提交 M2 代码
- **下一步**：M3 · FoldOrderResolver 多片段 Z 切换与穿模检测

---

## 里程碑追踪

> 子任务用 `[ ]` 未开始 / `[WIP]` 进行中 / `[DONE YYYY-MM-DD]` 完成。

### M0 · 触摸链路验证 [DONE 2026-05-13]

- [DONE 2026-05-13] `FoldController.ts` 调试版打通触摸事件链路

### M1 · 单片段折叠 [DONE 2026-05-14]

- [DONE 2026-05-13] M1-a 节点骨架 + Prefab，编辑器内可见一张静态纸片
- [DONE 2026-05-14] M1-b `setFoldAngle(degY)` 驱动 `pivot.eulerAngles.y`，`_tmpEuler` 复用；0°/90°/120° 预览与 Pivot 子树验证通过
- [DONE 2026-05-14] M1-c：`tweenFoldTo` + `MotionEasing.ts`（`duration-fold` 600 ms + `ease-fold` bezier）；`debugAutoTweenFold180` 编辑器验收通过
- [DONE 2026-05-14] M1-d `update` 内 sibling 切换（`|y|>90` Back 置顶，`|y|<90` Front 置顶）；越 90° tween 无错误遮挡；`onLoad` 缓存 `_pivotNode/_frontNode/_backNode`
- [DONE 2026-05-14] M1-e 正反面双 Sprite + UV（`FragmentConfig` 接口 + `init()` 注入 SpriteFrame，编辑器验证通过）
- [DONE 2026-05-14] M1-f `PaperFragment` 完整对外 API（`init` / `commitFold` / `revertFold` / `isFolded` + 折叠事件派发）

### M2 · 关卡数据 + 单关跑通 [DONE 2026-05-14]

- [DONE 2026-05-14] M2-a `LevelRegistry` 单例，写死章节 1 第 1 关（左右对折，2 片段）
- [DONE 2026-05-14] M2-b `LevelRunner` 关卡运行器：从 Registry 取配置 → 实例化 FragmentPrefab → `init()` 注入 SpriteFrame → 派发 LEVEL_START / LEVEL_COMPLETE
- [DONE 2026-05-14] M2-c 编辑器验证：LevelTest 场景跑通，2 个片段正确加载并渲染

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
| 2026-05-14 | M2：片段位置用 `polyPoints` 的 AABB 中心计算，而非 `pivotPos`；`LevelRegistry` / `EventManager` 改为手写单例避开 Cocos 3.8 TS 对 `Singleton<T>` 泛型 `this` 参数与 `protected constructor` 的类型冲突 | `pivotPos` 是折痕点不是片段中心，AABB 更准确；手写单例比改泛型约束更安全 |
| 2026-05-14 | M1-f：`commitFold` / `revertFold` 返回 `Promise`，tween 完成后 `.call()` 派发事件再 resolve；`EventManager` 改为手写单例避开 Cocos 3.8 TS 对 `Singleton<T>` 泛型 `this` 参数的类型冲突 | Promise 链式调用比 callback 更清晰；手写单例比改泛型约束更安全 |
| 2026-05-14 | M1-e：`FragmentConfig` 独立到 `data/`，`init()` 三参数（config + frontSF + backFullSF），背面 UV 用 `SpriteFrame.rect` 直接裁剪 | `config` 与 UI 解耦；`backRect` 无需手动算镜像 UV，引擎级 rect 裁剪更可靠 |
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
- ~~Q3~~：M1-e 已收敛——背面 UV 直接用 `SpriteFrame.rect` 裁剪，不手动算镜像坐标。
- **Q4**：微信小游戏 30 FPS 锁帧是否需要在 iOS Native 也保持？还是 Native 解锁到 60？M6 实测后决定。

---

## 当前会话上下文摘要（给下一次新会话）

- **M2 已合并**：LevelRegistry 写死关卡数据 + LevelRunner 实例化片段跑通，2 片段正确渲染。设计分辨率修正为 720×1280。
- **下一里程碑 M3**：FoldOrderResolver 多片段 Z 切换与穿模检测。

协作纪律提醒：推进结束必更新本文件；新增事件先注册 `GameEvents`；不主动创建 `.meta` / 不动 `temp/library/profiles/settings/`。

---

## 版本

- v0.1（2026-05-13）初版，建立进度追踪机制。
- v0.2（2026-05-14）同步 M1-b 完成与 M1-c 起点。
- v0.3（2026-05-14）同步 M1-c 实现落位与验收步骤。
- v0.4（2026-05-14）M1-c 验收通过，进入 M1-d。
- v0.5（2026-05-14）M1-d 实现落位（sibling 切换），待预览验收。
- v0.6（2026-05-14）M1-d 验收通过，进入 M1-e。
- v0.7（2026-05-14）M1-e 完成（FragmentConfig 接口 + init 注入 + 编辑器验证通过），进入 M1-f。
- v0.8（2026-05-14）M1-f 完成（commitFold / revertFold / isFolded Promise API + 事件派发），M1 全部子任务完成，进入 M2。
- v0.9（2026-05-14）M2 完成（LevelRegistry + LevelRunner 单关跑通 + 设计分辨率修正），进入 M3。
