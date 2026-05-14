import { _decorator, Component, Node, Sprite, SpriteFrame, tween, Tween, Vec3, v3 } from 'cc';

import { FragmentConfig } from '../data/FragmentConfig';
import { DURATION_FOLD_SEC, easeFold } from '../utils/MotionEasing';
import { EventManager, GameEvents } from '../utils/EventManager';

const { ccclass, property } = _decorator;

/**
 * PaperFragment · 单个可折叠纸片组件。
 *
 * 设计依据见 `specs/system-arch.md` §2.1。
 *
 * 期望挂载点：`FragmentRoot` 节点（同时需要 `UITransform` 组件提供尺寸）。
 *
 * 期望子节点结构（在编辑器里搭好后挂本组件）：
 *
 * ```
 *   FragmentRoot          ← 本组件挂在这里
 *   └── Pivot             ← 旋转支点（本地坐标 = 折痕在 FragmentRoot 坐标系下的位置）
 *       ├── FrontSprite   ← 正面图案
 *       └── BackSprite    ← 背面图案，eulerAngles = (0, 180, 0) 与正面背靠背
 * ```
 *
 * 当前实现阶段：**M1-f 完成**（`init` / `commitFold` / `revertFold` / `isFolded` 全部对外 API 可用）。
 *  - M1-a～d：节点骨架、角度驱动、tween、sibling 切换；
 *  - M1-e：`FragmentConfig` 接口 + `init()` 注入 SpriteFrame；
 *  - M1-f：`commitFold` / `revertFold` Promise API + 折叠事件派发。
 *
 * 关键纪律（呼应 `.cursorrules`）：
 *  - 折叠以 tween 作用于 `pivot.eulerAngles`，**严禁**直接旋转本节点；
 *  - `update` 内禁分配（避免 `new Vec3` / `instantiate` / `getComponent`）；
 *  - Inspector 引用在 `onLoad` 缓存在 `_pivotNode` / `_frontNode` / `_backNode`，`update` 不再 `getComponent`；
 */
@ccclass('PaperFragment')
export class PaperFragment extends Component {

    /**
     * 旋转支点子节点。
     *
     * 必须是本节点的直接子节点，且本地坐标位于折痕线上。
     * 折叠动画作用于它的 `eulerAngles`，正反面 Sprite 作为它的子节点会跟随旋转。
     */
    @property({
        type: Node,
        tooltip: '旋转支点：当前节点的直接子节点，本地坐标设在折痕线上',
    })
    public pivot: Node | null = null;

    /**
     * 正面 Sprite。
     *
     * 应为 `pivot` 的子节点。UV 在 M1-e 后由 `FragmentConfig.frontRect` 注入。
     */
    @property({
        type: Sprite,
        tooltip: '正面 Sprite，挂在 Pivot 下；UV 对应 FragmentConfig.frontRect（M1-e 注入）',
    })
    public frontSprite: Sprite | null = null;

    /**
     * 背面 Sprite。
     *
     * 应为 `pivot` 的子节点，且自身 `eulerAngles.y = 180`，与正面背靠背。
     * UV 对应 `FragmentConfig.backRect`，即「折过去后正好补齐图案」的那一块区域。
     */
    @property({
        type: Sprite,
        tooltip: '背面 Sprite，挂在 Pivot 下，eulerAngles.y = 180；UV 对应 FragmentConfig.backRect',
    })
    public backSprite: Sprite | null = null;

    /**
     * 调试：进入场景后先将 pivot 设为 0°，再 tween 到 180° 一次。
     *
     * 接 `FoldController` 后应取消勾选，避免与手势冲突。
     */
    @property({
        tooltip: '仅调试：运行时自动播放一次折叠 tween 至 180°（接入手势后请关闭）',
    })
    public debugAutoTweenFold180: boolean = false;

    // -------------------------------------------------------------------------
    // 内部缓存
    // -------------------------------------------------------------------------

    /**
     * 复用的欧拉角向量。
     *
     * 用途：避免 `setFoldAngle` 每次调用都 `new Vec3()`。
     * 一关里折叠次数虽然有限，但同一份逻辑后续会被 `tween` / `update` 频繁调用（M1-c / M1-d），
     * 这里预先按 `.cursorrules` 第三条「禁止高频分配」的约束写。
     */
    private readonly _tmpEuler: Vec3 = new Vec3();

    /** Pivot 子树内「朝上渲染」的一侧是否为背面（`|y| > 90°` 时为 true）。 */
    private _backOnTop = false;

    /** 缓存在 `onLoad`，供 `update` 零 `getComponent`。 */
    private _pivotNode: Node | null = null;

    private _frontNode: Node | null = null;

    private _backNode: Node | null = null;

    /** 片段数据配置，由 LevelLoader 通过 init() 注入。 */
    private _config: FragmentConfig | null = null;

    /** 当前折叠角度（°），0 = 完全展开，180 = 完全折叠。 */
    private _foldAngle = 0;

    // -------------------------------------------------------------------------
    // 生命周期
    // -------------------------------------------------------------------------

    /**
     * 初始化片段数据与贴图。
     *
     * @param config 片段配置（多边形、pivot、折叠顺序等）。
     * @param frontSF 正面 SpriteFrame。
     * @param backFullSF 背面 SpriteFrame（M2 阶段与 frontSF 相同，M3+ 阶段用完整图裁剪）。
     */
    public init(
        config: FragmentConfig,
        frontSF: SpriteFrame,
        backFullSF: SpriteFrame,
    ): void {
        this._config = config;
        this._applySpriteFrames(frontSF, backFullSF);
    }

    private _applySpriteFrames(frontSF: SpriteFrame, backFullSF: SpriteFrame): void {
        if (!this.frontSprite || !this.backSprite) return;
        this.frontSprite.spriteFrame = frontSF;
        this.backSprite.spriteFrame = backFullSF;
    }

    /**
     * onLoad 阶段唯一职责：核对 Inspector 引用是否就位。
     *
     * 故意只 warn 不抛异常 —— 让编辑器仍能正常呈现节点结构，
     * 便于开发者在 Inspector 里逐步补齐字段（M1-a 阶段尤其需要）。
     */
    protected onLoad(): void {
        const tag = `[PaperFragment "${this.node.name}"]`;
        if (!this.pivot) {
            console.warn(`${tag} 缺少 pivot 引用，请在 Inspector 把 Pivot 子节点拖到 pivot 字段`);
        }
        if (!this.frontSprite) {
            console.warn(`${tag} 缺少 frontSprite 引用，请把 FrontSprite 节点（含 Sprite 组件）拖入`);
        }
        if (!this.backSprite) {
            console.warn(`${tag} 缺少 backSprite 引用，请把 BackSprite 节点（含 Sprite 组件）拖入`);
        }

        this._cachePivotChildNodes();
        this._initSiblingOrderFromPivotAngle();
    }

    protected update(_dt: number): void {
        void _dt;
        if (!this._pivotNode || !this._frontNode || !this._backNode) {
            return;
        }
        if (!this._pivotNode.isValid || !this._frontNode.isValid || !this._backNode.isValid) {
            return;
        }
        // 只读标量，避免在 `update` 里依赖临时 Vec3 分配习惯（各版本 `eulerAngles` getter 实现不一）。
        const absY = Math.abs(this._pivotNode.eulerAngles.y);
        this._syncSiblingOrder(absY);
    }

    protected start(): void {
        if (!this.debugAutoTweenFold180) {
            return;
        }
        // 验证 M1-f 新 API：折叠 → 停留 1.5 s → 回弹
        this.setFoldAngle(0);
        void this.commitFold().then(() => {
            setTimeout(() => {
                void this.revertFold('release');
            }, 1500);
        });
    }

    protected onDestroy(): void {
        if (this.pivot?.isValid) {
            Tween.stopAllByTarget(this.pivot);
        }
    }

    // -------------------------------------------------------------------------
    // 对外 API
    // -------------------------------------------------------------------------

    /**
     * 设置当前折叠角度（绕 Pivot 的 Y 轴）。
     *
     * @param degY 角度（°）。0 = 完全展开；180 = 完全折叠；中间值表示「折一半」。
     *
     * 仅作用于 `pivot.eulerAngles.y`，**不**直接旋转本组件所在节点。
     * 设计依据：`specs/system-arch.md` §2.1。
     */
    public setFoldAngle(degY: number): void {
        if (!this.pivot) return;
        Tween.stopAllByTarget(this.pivot);
        this._tmpEuler.set(0, degY, 0);
        this.pivot.eulerAngles = this._tmpEuler;
        this._foldAngle = degY;
        this._syncSiblingOrder(Math.abs(degY));
        this._emitProgress(degY);
    }

    /**
     * 派发折叠进度事件。
     *
     * 每次 `setFoldAngle` 调用或 `commitFold` / `revertFold` 发起时触发，
     * 供 FoldController 派发振动、UI 派发辅助线等。
     */
    private _emitProgress(angleDeg: number): void {
        EventManager.getInstance().emit(GameEvents.FRAGMENT_FOLD_PROGRESS, {
            fragmentId: this._config?.id ?? '',
            angleDeg,
        });
    }

    /**
     * 以 `duration-fold` 与 `ease-fold` 驱动 `pivot` 绕本地 Y 轴旋转到目标角。
     *
     * 重复调用会先 `stopAllByTarget(pivot)`，避免多条 tween 叠在同一节点上。
     *
     * @param degY 目标角度（°），通常 ∈ [0, 180]。
     * @param durationSec 时长（秒）；默认 `DURATION_FOLD_SEC`，与 `specs/ui-design.md` 对齐。
     */
    public tweenFoldTo(degY: number, durationSec: number = DURATION_FOLD_SEC): void {
        if (!this.pivot) return;
        Tween.stopAllByTarget(this.pivot);
        const end = v3(0, degY, 0);
        tween(this.pivot)
            .to(durationSec, { eulerAngles: end }, { easing: easeFold })
            .start();
    }

    /**
     * 将片段折叠到 180° 并提交。
     *
     * 以 `duration-fold` + `ease-fold` 驱动 pivot 旋转到 180°，
     * 完成后派发 `FRAGMENT_FOLD_COMMIT` 事件供 WinChecker 等模块消费。
     *
     * @returns Promise，折叠动画完成时 resolve。
     */
    public commitFold(): Promise<void> {
        if (!this.pivot) return Promise.resolve();

        this._foldAngle = 180;
        this._emitProgress(this._foldAngle);

        return new Promise<void>((resolve) => {
            Tween.stopAllByTarget(this.pivot);
            tween(this.pivot)
                .to(DURATION_FOLD_SEC, { eulerAngles: v3(0, 180, 0) }, { easing: easeFold })
                .call(() => {
                    this._syncSiblingOrder(180);
                    EventManager.getInstance().emit(GameEvents.FRAGMENT_FOLD_COMMIT, {
                        fragmentId: this._config?.id ?? '',
                    });
                    resolve();
                })
                .start();
        });
    }

    /**
     * 将片段回弹到 0°（展开状态）。
     *
     * 以 60% `duration-fold` 驱动 pivot 回到 0°，
     * 完成后派发 `FRAGMENT_FOLD_REVERT` 事件。
     *
     * @param reason 回弹原因，用于区分「玩家松手释放」和「顺序冲突」。
     * @returns Promise，回弹动画完成时 resolve。
     */
    public revertFold(reason: 'release' | 'order-conflict' = 'release'): Promise<void> {
        if (!this.pivot) return Promise.resolve();

        this._foldAngle = 0;

        return new Promise<void>((resolve) => {
            Tween.stopAllByTarget(this.pivot);
            tween(this.pivot)
                .to(DURATION_FOLD_SEC * 0.6, { eulerAngles: v3(0, 0, 0) }, { easing: easeFold })
                .call(() => {
                    this._syncSiblingOrder(0);
                    EventManager.getInstance().emit(GameEvents.FRAGMENT_FOLD_REVERT, {
                        fragmentId: this._config?.id ?? '',
                        reason,
                    });
                    resolve();
                })
                .start();
        });
    }

    /** 查询当前片段是否已折叠到 180°。 */
    public isFolded(): boolean {
        return this._foldAngle >= 180;
    }

    // -------------------------------------------------------------------------
    // 渲染顺序（Pivot 子节点 sibling）
    // -------------------------------------------------------------------------

    /**
     * 缓存 Pivot 以及其下正反节点引用；并校验父子关系（翻面逻辑依赖「二者为 Pivot 直系子节点」）。
     */
    private _cachePivotChildNodes(): void {
        this._pivotNode = this.pivot;
        this._frontNode = this.frontSprite?.node ?? null;
        this._backNode = this.backSprite?.node ?? null;
        if (!this._pivotNode || !this._frontNode || !this._backNode) {
            return;
        }
        if (this._frontNode.parent !== this._pivotNode || this._backNode.parent !== this._pivotNode) {
            console.warn(
                `[PaperFragment "${this.node.name}"] FrontSprite / BackSprite 节点必须是 Pivot 的直接子节点，`
                    + '否则 M1-d sibling 切换无效',
            );
        }
    }

    /**
     * 与当前 Pivot 角度对齐 `_backOnTop` 并把正确的一侧置于子节点列表末尾（同层内通常后绘在上）。
     */
    private _initSiblingOrderFromPivotAngle(): void {
        if (!this._pivotNode || !this._frontNode || !this._backNode) {
            return;
        }
        const absY = Math.abs(this._pivotNode.eulerAngles.y);
        this._backOnTop = absY > 90;
        const topNode = this._backOnTop ? this._backNode : this._frontNode;
        const lastIdx = this._pivotNode.children.length - 1;
        topNode.setSiblingIndex(lastIdx);
    }

    /**
     * 按折叠深度切换 sibling：`|y| > 90°` 时背面朝外需压过正面。
     *
     * 阈值取开区间以避免在恰好 90° 振荡；与 `specs/system-arch.md` §2.1 描述一致。
     */
    private _syncSiblingOrder(absDegY: number): void {
        if (!this._pivotNode || !this._frontNode || !this._backNode) {
            return;
        }
        const lastIdx = this._pivotNode.children.length - 1;
        if (absDegY > 90 && !this._backOnTop) {
            this._backNode.setSiblingIndex(lastIdx);
            this._backOnTop = true;
        } else if (absDegY < 90 && this._backOnTop) {
            this._frontNode.setSiblingIndex(lastIdx);
            this._backOnTop = false;
        }
    }
}
