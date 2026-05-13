# Healing Origami · 系统架构规范

> 作用域：本文件定义**工程视角**的所有架构决策（模块拆分、数据流、渲染方案、平台适配、性能预算）。
> 玩法规则见 [`specs/game-logic.md`](./game-logic.md)。
> 视觉 Token 见 [`specs/ui-design.md`](./ui-design.md)。
> 所有约束以本项目 [`.cursorrules`](../.cursorrules) 为最高优先级，本文件中若与 `.cursorrules` 冲突，以 `.cursorrules` 为准。

---

## 0. 技术底座

| 项 | 选型 |
|---|---|
| 引擎 | Cocos Creator **3.8.8**（禁用 2.x API） |
| 语言 | TypeScript（按 strict 风格写，即使 tsconfig 未开 strict） |
| **主目标平台** | 微信小游戏 |
| **次目标平台** | iOS App（Native）、Android App（Native）、H5 |
| **开发期平台** | Web 预览（编辑器内 Preview） |
| 设计分辨率 | 720 × 1280（竖屏） |
| 锁帧 | 30 FPS（治愈节奏不需要 60，省电） |
| 包管理 | npm（运行时不引入需 Node 的依赖） |

---

## 1. 模块总览

```
┌─────────────────────────────────────────────────────────────┐
│                          UI 层 (ui/)                          │
│   HudView · CelebrateView · JournalView · DesignTokens       │
└──────────────────────┬──────────────────────────────────────┘
                       │  EventManager (utils/)
┌──────────────────────┴──────────────────────────────────────┐
│                       核心层 (core/)                          │
│   FoldController · PaperFragment · FoldOrderResolver         │
│   LevelLoader · WinChecker                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│            数据层 (data/)              平台层 (platform/)     │
│   LevelConfig · LevelRegistry         WXSDK                  │
│   ProgressStore                                              │
└──────────────────────────────────────────────────────────────┘
```

**通信原则**：

- 所有跨层调用走 `EventManager.getInstance().emit(GameEvents.XXX, payload)`。
- 业务模块**禁止互相 import**（UI 不 import core，core 不 import ui）。
- 平台能力**只能**经 `WXSDK` 调用，业务层不感知是否在微信环境。
- 数据层是纯数据，**不 import** core 与 ui。

---

## 2. 核心层组件设计

### 2.1 `PaperFragment.ts`（单片段折叠组件）

挂在每个可折叠纸片的根节点上。

#### 节点结构

```
FragmentRoot                          <- 持有 PaperFragment 组件，UITransform 与 polyPoints 一致
└── Pivot (空节点)                    <- 旋转支点，pos = pivotPos
    ├── FrontSprite (frontRect UV)    <- 正面图案
    └── BackSprite  (backRect UV)     <- 背面图案，eulerAngles = (0, 180, 0)
```

> **核心约束**：折叠通过 `tween(Pivot.eulerAngles)` 完成，**严禁**直接旋转 `FragmentRoot` 或 `Front/BackSprite`。

#### 关键 @property

```ts
@property({ type: Node, tooltip: '旋转支点节点，必须是 FragmentRoot 的直接子节点' })
public pivot: Node | null = null;

@property({ type: Sprite, tooltip: '正面 Sprite，UV 对应 frontRect' })
public frontSprite: Sprite | null = null;

@property({ type: Sprite, tooltip: '背面 Sprite，UV 对应 backRect' })
public backSprite: Sprite | null = null;
```

`FragmentConfig`（`polyPoints` / `correctOrder` / `foldAxis` 等）通过 `init(config)` 方法注入，**不**做成 `@property`——Inspector 不适合维护多边形坐标，关卡数据由 `LevelLoader` 注入。

#### 对外 API

```ts
init(config: FragmentConfig, atlas: SpriteFrame): void;
setAngle(deg: number): void;          // 手指拖拽中调用，0–180
commitFold(): Promise<void>;          // 吸附到 180°，过程触发 PIECE_FOLDED 事件
revertFold(): Promise<void>;          // 回弹到 0°
isFolded(): boolean;
```

#### Z 切换（核心难点）

在 `update` 里：

```ts
const ay = Math.abs(this.pivot!.eulerAngles.y) + Math.abs(this.pivot!.eulerAngles.x);
if (ay > 90 && !this._backOnTop) {
    this.backSprite!.node.setSiblingIndex(-1);  // 翻到背面
    this._backOnTop = true;
} else if (ay <= 90 && this._backOnTop) {
    this.frontSprite!.node.setSiblingIndex(-1);
    this._backOnTop = false;
}
```

**注意**：`update` 内**绝对不允许** `new Vec3()` / `instantiate` / `getComponent`（`.cursorrules` 第三条）。所有引用必须在 `onLoad` 缓存。

---

### 2.2 `FoldController.ts`（手势 → 折叠会话）

> 当前已存在一个最小调试版（仅 console.log），M1 起替换为完整版。

#### 职责

1. 监听 `Canvas` 节点上的 `Input.EventType.TOUCH_*`。
2. `TOUCH_START` 命中 `PaperFragment` → 进入「折叠会话」。
3. `TOUCH_MOVE` 把屏幕位移按系数 `k` 映射到角度，调用 `PaperFragment.setAngle(α)`。
4. `TOUCH_END` 根据释放角度调用 `commitFold` 或 `revertFold`。
5. 全程派发 `GAME_EVENT_FOLDING`，供 UI 显示折痕辅助线、振动等。

#### 输入命中

- 使用 `targetCamera.screenPointToRay` + 节点 `UITransform.hitTest` 而非 `Mask(Polygon)`。
- 对每个 fragment 的多边形采用**预计算的 AABB 粗筛 + 点在多边形内精筛**（射线法）。
- 命中点向折痕边缘扩 `8 px` 容差（`.cursorrules` 第五条触控优化）。

---

### 2.3 `FoldOrderResolver.ts`（多片段 Z-Order 与穿模检测）

#### 职责

1. 维护当前已折片段栈 `stack: PaperFragment[]`。
2. 每次 `PaperFragment.commitFold` 前调用 `canCommit(fragment)`：检查该 fragment 折叠后是否会与已折片段发生几何重叠但 Z 序矛盾。
3. 折叠成功后调用 `pushFolded(fragment)`，更新 sibling index。
4. 顺序错误时 emit `FRAGMENT_FOLD_REVERT`（待新增事件）+ 高亮提示。

#### 关键算法

- 折叠后的多边形 = 原始 `polyPoints` 沿 `pivot` 镜像后的坐标集。
- 重叠判定：两多边形 AABB 相交 → SAT 精检。
- 顺序判定：`fragment.correctOrder` 必须 > stack 中所有「与之几何相交」片段的 `correctOrder`。

---

### 2.4 `LevelLoader.ts`（关卡数据 → 场景节点）

#### 职责

1. 从 `LevelRegistry.get(levelId)` 拿到 `LevelConfig`。
2. 加载 `bgTexture`（resources / remote）。
3. 为每个 `FragmentConfig` 实例化 `FragmentPrefab`，注入 `init(config, atlas)`。
4. 完成后 emit `LEVEL_START`。

#### 卸载

- 退关时一次性 `destroy()` 整棵 `paperRoot`。
- 调用 `assetManager.releaseAsset(texture)` 主动释放贴图，**不依赖** GC。
- 微信小游戏 `wx.onMemoryWarning` 触发时优先释放非当前章节的贴图缓存。

---

### 2.5 `WinChecker.ts`（通关判定）

#### 职责

监听 `PIECE_FOLDED`，比对已折片段数 vs `LevelConfig.fragments.length`，全部折叠 → emit `LEVEL_COMPLETE`。

不做几何精校（只检查计数），因为 `FoldOrderResolver` 已经在每步把关。

---

## 3. 数据层

### 3.1 `LevelConfig.ts`（接口定义）

```ts
import { Vec2, Vec3 } from 'cc';

export type FoldAxis = 'left' | 'right' | 'top' | 'bottom' | 'diagonal';

export interface RectUV {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
}

export interface FragmentConfig {
    readonly id: string;
    readonly polyPoints: readonly Vec2[];
    readonly pivotPos: Vec2;
    readonly pivotDir: Vec3;
    readonly foldAxis: FoldAxis;
    readonly correctOrder: number;
    readonly frontRect: RectUV;
    readonly backRect: RectUV;
}

export type ChapterId = 'tea' | 'letter' | 'childhood' | 'travel';

export interface LevelConfig {
    readonly levelId: string;
    readonly chapterId: ChapterId;
    readonly title: string;
    readonly bgTexture: string;
    readonly paperSize: { readonly w: number; readonly h: number };
    readonly fragments: readonly FragmentConfig[];
    readonly celebrateAnim?: string;
}
```

### 3.2 `LevelRegistry.ts`

静态注册表（继承 `Singleton`），关卡数据**写死在代码里**（v1）或从 `resources/levels/{levelId}.json` 加载（v2）。

### 3.3 `ProgressStore.ts`

```ts
interface ProgressV1 {
    readonly version: 1;
    readonly unlockedLevels: readonly string[];
    readonly completedLevels: readonly string[];
}
```

经 `WXSDK.setStorage('progress.v1', JSON)` 持久化。**版本号前缀**保证未来字段变更可平滑迁移。

---

## 4. 跨模块通信（事件清单）

### 4.1 已有事件（来自 `assets/scripts/utils/EventManager.ts`）

复用：
- `LEVEL_START`、`LEVEL_COMPLETE`、`LEVEL_FAIL`
- `PIECE_FOLDED`
- `GAME_EVENT_FOLDING`
- `UI_PANEL_OPEN`、`UI_PANEL_CLOSE`

### 4.2 待新增事件（M1 起按需追加到 `GameEvents`）

> 命名严格遵循已有「dot 风格」，**不**使用 slash。

| 事件名 | payload | 触发时机 |
|---|---|---|
| `level.load.start` | `{ levelId: string }` | LevelLoader 开始加载贴图与片段 |
| `level.load.done` | `{ levelId: string; fragmentCount: number }` | LevelLoader 完成 |
| `fragment.fold.begin` | `{ fragmentId: string }` | FoldController 进入折叠会话 |
| `fragment.fold.progress` | `{ fragmentId: string; angleDeg: number }` | 拖拽过程中 |
| `fragment.fold.commit` | `{ fragmentId: string }` | 吸附 180° 提交（与已有 `PIECE_FOLDED` 等价，新事件名更明确，二选一） |
| `fragment.fold.revert` | `{ fragmentId: string; reason: 'release' \| 'order-conflict' }` | 回弹 |

> 新增事件必须先在 `GameEvents` 注册并写明 payload 注释。`.cursorrules` 第四条强制。

### 4.3 事件 vs 直接调用边界

| 场景 | 走事件 | 直接调用 |
|---|---|---|
| FoldController → PaperFragment | ✗ | ✓ 同模块持有引用 |
| PaperFragment → FoldOrderResolver | ✗ | ✓ 同模块持有引用 |
| WinChecker → UI 通关弹窗 | ✓ `LEVEL_COMPLETE` | ✗ |
| LevelLoader → UI 顶栏 | ✓ `LEVEL_START` | ✗ |

**判别标准**：同一模块内（都在 `core/`）且有强语义耦合 → 直接调用；跨层 → 事件。

---

## 5. 渲染方案

### 5.1 多边形片段渲染（核心决策）

**不**使用 Cocos 内置 `Mask(Type: Polygon)`。原因：
- 每个 Mask 触发一次 Stencil 写入 + 读取，单屏 30+ 片段 → Stencil 调用占满，微信小游戏中低端机显著掉帧。
- Mask 不支持 UV 偏移，正反面切换会非常别扭。

**采用方案**：美术侧**预切**每个 fragment 为独立 PNG（带预乘 alpha）。
- 优点：无 Stencil 调用，Sprite 直绘，DrawCall 可合批。
- 代价：每关美术需提供 N 张片段图 + 1 张完整图（背面 UV 用完整图采样）。

### 5.2 正反面双 Sprite

`FrontSprite` 直接用预切片段图。
`BackSprite` 用完整图 + `frontRect` 的镜像 UV——这样翻到背面时玩家看到的「就是这块纸折过来应该露出的图案」，是「啊哈」时刻的视觉根基。

### 5.3 合批

- 同一关所有 `FrontSprite` 共用一张片段图集（`SpriteAtlas`）→ 1 DrawCall。
- 所有 `BackSprite` 共用「完整图」单张纹理 → 1 DrawCall。
- 总目标：**单关 ≤ 8 DrawCall**（含 UI）。

---

## 6. 平台适配

> 项目目标是 **跨平台**：主投放微信小游戏，次投放 iOS / Android Native App 与 H5。
> 所有平台差异**必须**经 `platform/` 层抽象，业务代码只看到 `Promise` 与统一类型（`.cursorrules` 第四条）。

### 6.1 平台抽象层（核心约束）

业务代码**只允许** import `platform/` 下的封装，**禁止**直接调用：

| 禁止 | 必须经 |
|---|---|
| `wx.*`（全局对象） | `WXSDK` |
| `cc.sys.platform` / `cc.sys.os` 散落判断 | `PlatformDetector` |
| `localStorage` / `wx.setStorage` / Native 文件 IO | `Storage` 统一接口 |
| `navigator.vibrate` / `wx.vibrateShort` / Native 振动 | `Haptics` 统一接口 |

`platform/` 内按平台分文件实现，编译期通过 Cocos 的**预处理宏**或运行时**懒注入**切换。建议结构（M6 落地）：

```
platform/
├── index.ts              # 统一出口，按平台选择实现
├── PlatformDetector.ts   # is.wechat / is.ios / is.android / is.web
├── WXSDK.ts              # 微信小游戏专用（已存在）
├── Storage.ts            # 统一接口：get/set/remove
│   ├── Storage.web.ts    # localStorage 实现
│   ├── Storage.wx.ts     # wx.storage 实现
│   └── Storage.native.ts # sys.localStorage 实现（Native 同样可用）
└── Haptics.ts            # 统一接口：light/medium/heavy
    ├── Haptics.web.ts    # navigator.vibrate
    ├── Haptics.wx.ts     # wx.vibrateShort
    └── Haptics.native.ts # jsb.reflection.callStaticMethod
```

### 6.2 微信小游戏（主目标）

| 项 | 方案 |
|---|---|
| 首包大小 | < 2 MB，仅含引擎 + 章节 1 的 5 关 |
| 分包 | 章节 2 / 3 / 4 各一个 subpackage |
| 远程资源 | 章节 3+ 的高清贴图走 CDN，`assetManager.loadRemote` |
| 内存释放 | 退关 `destroy()` + `releaseAsset()`；监听 `wx.onMemoryWarning` |
| 触控容差 | `UITransform.hitTest` 外扩 8 px |
| 振动 | 经 `Haptics`，微信侧实现为 `wx.vibrateShort` |
| 存档 | 经 `Storage`，微信侧实现为 `wx.setStorage('progress.v1', JSON)` |
| 字体 | Klee One 子集化 4000 字，单文件 < 600 KB |
| 帧率 | 锁 30 FPS |
| 启动 | 首屏不做网络请求，进入章节选择页才拉远程资源 |

`WXSDK.ts` 需要扩展的方法（M6）：

```ts
vibrateShort(type: 'light' | 'medium' | 'heavy'): Promise<void>;
setStorage(key: string, value: unknown): Promise<void>;
getStorage<T>(key: string): Promise<T | null>;
onMemoryWarning(cb: () => void): void;
loadSubpackage(name: string): Promise<void>;
```

### 6.3 iOS / Android Native（次目标）

| 项 | 方案 |
|---|---|
| 构建方式 | Cocos Creator 构建面板 → iOS / Android 模板 → Xcode / Android Studio 出包 |
| 存档 | `sys.localStorage`（Cocos 在 Native 已封装 SQLite / NSUserDefaults） |
| 振动 | iOS：`jsb.reflection.callStaticMethod` → `UIImpactFeedbackGenerator`；Android：`jsb.reflection.callStaticMethod` → `Vibrator` |
| 远程资源 | `assetManager.loadRemote` 直接可用，无需分包 |
| 字体 | 内置 Klee One（不再子集化，单字体 ~3 MB 可接受） |
| 帧率 | 锁 30 FPS（iOS 低端 / Android 中端机仍稳） |
| 包大小 | iOS IPA ≤ 30 MB，Android APK ≤ 25 MB |
| 安全区 | 监听 `screen.on('window-resize')` + `sys.getSafeAreaRect`，HUD 节点用 `Widget` 组件锁安全区 |
| 分辨率 | 同设计分辨率（720 × 1280），`Canvas.fitHeight = true` |
| 内购（v2） | 经 `IAP.ts`（M8 后再做） |

### 6.4 H5（开发预览 + 兜底投放）

| 项 | 方案 |
|---|---|
| 入口 | 一个 `index.html`，加 `<meta viewport>` 锁缩放 |
| 存档 | 经 `Storage`，Web 侧实现为 `localStorage` |
| 振动 | 经 `Haptics`，Web 侧 `navigator.vibrate`（支持率有限，不支持则 noop） |
| 触控 | 同 Web 标准 Touch Event；Mac 触控板用 Mouse Event 走 fallback |

### 6.5 跨平台代码规范

代码里**严禁**写：

```ts
if (sys.platform === sys.Platform.WECHAT_GAME) { ... }
if (typeof wx !== 'undefined') { ... }
```

必须改成：

```ts
import { Platform } from '../platform';
if (Platform.is.wechat) { ... }
```

或更推荐：**用接口抽象，让 `platform/` 内部决定怎么做**，业务层根本不知道当前是什么平台。

### 6.6 各平台已知差异清单（持续更新）

| 能力 | 微信 | iOS Native | Android Native | H5 |
|---|---|---|---|---|
| 触控 | 可用 | 可用 | 可用 | 可用 |
| 振动 | 可用 `wx.vibrate*` | 可用 Taptic Engine | 可用 Vibrator | 受限，仅 Chrome / Edge |
| 本地存储 | 可用 `wx.storage` | 可用 NSUserDefaults | 可用 SharedPreferences | 可用 localStorage |
| 远程加载 | 可用 | 可用 | 可用 | 可用 |
| 分包 | 可用 | 不可用（直接打包） | 不可用（直接打包） | 不可用 |
| 字体动态加载 | 受限，需子集化 | 可用 | 可用 | 可用 |
| 后台播放 | 不可用 | 可用 | 可用 | 可用 |
| 系统返回键 | 无 | 无 | 需处理 | 无 |

---

## 7. 性能预算

| 指标 | 目标 |
|---|---|
| 单关初始化耗时 | < 300 ms（中端机 iPhone X / Mi 8） |
| 单关 DrawCall | ≤ 8 |
| 单关 Triangles | ≤ 600 |
| 帧率 | 稳定 30 FPS |
| 内存峰值（单关运行时） | < 80 MB |
| 首包大小 | < 2 MB |
| 章节包大小 | < 4 MB |

监控：开发期接 Cocos 内置 Stats Panel；上线后通过 `wx.reportPerformance` 上报到自建后台。

---

## 8. 实现里程碑

| M | 目标 | 关键文件 | 状态 |
|---|---|---|---|
| M0 | 触摸链路打通 | `FoldController.ts` | ✅ 已完成（调试版） |
| M1 | 单片段折叠（手指控制 0–180° + 正反面双 Sprite） | `PaperFragment.ts` | ⏳ 待开始 |
| M2 | 关卡数据结构 + 单关 hardcode 跑通 | `LevelConfig.ts` `LevelLoader.ts` | |
| M3 | `FoldOrderResolver` 多片段 Z 切换与穿模检测 | `FoldOrderResolver.ts` | |
| M4 | `WinChecker` + 通关展示动效 | `WinChecker.ts` `CelebrateView.ts` | |
| M5 | `DesignTokens.ts` 落地 + HUD + 手帐本（仅展示） | `DesignTokens.ts` `HudView.ts` `JournalView.ts` | |
| M6 | 微信适配（分包、存档、振动、性能） | `WXSDK.ts` 扩展、`ProgressStore.ts` | |
| M7 | 关卡编辑器（Cocos 自定义 Editor） + 折叠回放 | `editor/level-tool/*` | |

---

## 9. 目录最终态（M7 完成时）

```
assets/
├── resources/
│   ├── textures/                    # 共享纹理（背景、UI icon）
│   └── levels/                      # 关卡贴图按 chapter 分子目录
│       ├── tea/
│       ├── letter/
│       └── childhood/
├── prefabs/
│   ├── FragmentPrefab.prefab        # PaperFragment 标准模板
│   └── ui/
└── scripts/
    ├── core/
    │   ├── FoldController.ts
    │   ├── PaperFragment.ts
    │   ├── FoldOrderResolver.ts
    │   ├── LevelLoader.ts
    │   └── WinChecker.ts
    ├── data/
    │   ├── LevelConfig.ts
    │   ├── LevelRegistry.ts
    │   └── ProgressStore.ts
    ├── ui/
    │   ├── DesignTokens.ts
    │   ├── HudView.ts
    │   ├── CelebrateView.ts
    │   └── JournalView.ts
    ├── platform/
    │   ├── index.ts
    │   ├── PlatformDetector.ts
    │   ├── WXSDK.ts
    │   ├── Storage.ts
    │   └── Haptics.ts
    └── utils/
        ├── Singleton.ts
        ├── ComponentSingleton.ts
        └── EventManager.ts
```

---

## 10. 反例（禁止）

- 业务模块互相 import（必须经 EventManager）
- 在 `update` 内分配（`new Vec3` / `instantiate` / `getComponent`）
- `wx.*` 调用绕过 `WXSDK`
- 用 Cocos `Mask(Polygon)` 实现片段裁剪
- 在 Inspector 手动写多边形坐标（必须经 `LevelLoader.init`）
- UI 脚本写裸字面量颜色 / 数字（必须经 `DesignTokens`）
- 在 `FragmentRoot` 直接旋转（必须旋转 `Pivot` 子节点）

---

## 11. 版本

- v0.1（2026-05-13）初版，与 `game-logic.md` v0.1 配套。
