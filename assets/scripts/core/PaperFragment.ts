import { _decorator, Component, Node, Sprite } from 'cc';

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
 * 当前实现阶段：**M1-a · 骨架**
 *  - 仅声明结构与 @property 注入点；
 *  - 不含折叠逻辑（M1-b 起逐步填充：先固定动画 → tween → Z 切换 → UV → 完整 API）。
 *
 * 关键纪律（呼应 `.cursorrules`）：
 *  - 折叠以 tween 作用于 `pivot.eulerAngles`，**严禁**直接旋转本节点；
 *  - `update` 内禁分配（避免 `new Vec3` / `instantiate` / `getComponent`）；
 *  - Inspector 引用全部在 `onLoad` 阶段一次性校验，运行期不再做 null 防御。
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

    // -------------------------------------------------------------------------
    // 生命周期
    // -------------------------------------------------------------------------

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
    }
}
