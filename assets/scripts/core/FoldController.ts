import { _decorator, Component, EventTouch, Input, Camera } from 'cc';

// 最小可运行版：暂时移除对 EventManager / WXSDK 的依赖，
// 以排除「全局单例 / 跨模块副作用」与 Cocos 渲染管线的冲突可能。
// 等本版本运行无 `cameraPriority` 报错后，再分两步逐个加回：
//   1. 接回 WXSDK.vibrateShort
//   2. 接回 EventManager.emit(GAME_EVENT_FOLDING)
// import { EventManager, GameEvents } from '../utils/EventManager';
// import { WXSDK } from '../platform/WXSDK';

const { ccclass, property } = _decorator;

/**
 * 折纸滑动控制器（精简调试版）。
 *
 * 当前唯一职责：在挂载节点上监听触摸事件并打印日志，验证事件链路本身可用。
 *
 * 关键防御点：
 * 1. 必须在 Inspector 里把 Canvas 下的 Camera 手动拖进 `targetCamera`，
 *    不再使用通用的场景扫描，避免引擎在指针分发阶段读 `cameraPriority` 失败。
 * 2. 事件注册放在 `start()` 而不是 `onEnable / onLoad`，
 *    `start` 在引擎完成第一次场景刷帧后才执行，此时相机/管线已就绪。
 * 3. 每个回调首行强制 `if (!this.node.activeInHierarchy) return;`，
 *    避免节点已逻辑离场但事件仍被派发时进入业务。
 */
@ccclass('FoldController')
export class FoldController extends Component {

    /**
     * 手动绑定的主相机引用（Inspector 拖入）。
     *
     * 用途：让 PointerEventDispatcher 找到的相机优先级与脚本里参考的相机一致，
     *      避免脚本通过场景扫描拿到一个与渲染管线不同的相机实例。
     */
    @property({
        type: Camera,
        tooltip: '把 Canvas 下的 Camera 节点上的 Camera 组件手动拖到这里',
    })
    public targetCamera: Camera | null = null;

    /**
     * 滑动灵敏度倍率（保留 Inspector 入口，方便后续接回完整逻辑）。
     */
    @property({
        type: Number,
        tooltip: '滑动灵敏度倍率，1 = 原始位移；> 1 放大，< 1 收紧',
        slide: true,
        range: [0.1, 3, 0.05],
    })
    public sensitivity: number = 1;

    // -------------------------------------------------------------------------
    // 生命周期
    // -------------------------------------------------------------------------

    // 注意：刻意不写 onLoad / onEnable。事件注册只发生在 start()，
    // 保证引擎已完成首帧调度、相机管线已就位再挂监听。

    protected start(): void {
        if (!this.targetCamera || !this.targetCamera.isValid) {
            console.warn('[FoldController] targetCamera 未配置或无效，请在 Inspector 拖入 Canvas/Camera');
            return;
        }
        this.node.on(Input.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.on(Input.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.on(Input.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.on(Input.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    protected onDestroy(): void {
        // 与 start 对称解绑；不放在 onDisable，因为 start 不会被反复触发。
        this.node.off(Input.EventType.TOUCH_START, this._onTouchStart, this);
        this.node.off(Input.EventType.TOUCH_MOVE, this._onTouchMove, this);
        this.node.off(Input.EventType.TOUCH_END, this._onTouchEnd, this);
        this.node.off(Input.EventType.TOUCH_CANCEL, this._onTouchEnd, this);
    }

    // -------------------------------------------------------------------------
    // 守卫
    // -------------------------------------------------------------------------

    /**
     * 直接基于手动关联的相机做有效性判定，不再做场景级扫描。
     */
    private _canHandle(): boolean {
        return !!(this.targetCamera && this.targetCamera.isValid);
    }

    // -------------------------------------------------------------------------
    // 触摸回调（最小实现：仅打日志，便于先确认事件链路正常 + 无报错）
    // -------------------------------------------------------------------------

    private _onTouchStart(_event: EventTouch): void {
        if (!this.node.activeInHierarchy) return;
        if (!this._canHandle()) return;
        console.log('Touch detected: start');
    }

    private _onTouchMove(_event: EventTouch): void {
        if (!this.node.activeInHierarchy) return;
        if (!this._canHandle()) return;
        console.log('Touch detected: move');

        // ---- 以下为后续要接回的完整折叠逻辑，暂时注释 ----
        // const raw = _event.getDelta();
        // const dx = raw.x * this.sensitivity;
        // const dy = raw.y * this.sensitivity;
        // const stepLen = Math.sqrt(dx * dx + dy * dy);
        // this._totalDistance += stepLen;
        // this._distanceSinceVibrate += stepLen;
        // EventManager.getInstance().emit(GameEvents.GAME_EVENT_FOLDING, { ... });
        // if (this._distanceSinceVibrate >= this.vibrateThreshold) {
        //     WXSDK.getInstance().vibrateShort('light').catch(() => {});
        //     this._distanceSinceVibrate = 0;
        // }
    }

    private _onTouchEnd(_event: EventTouch): void {
        if (!this.node.activeInHierarchy) return;
        console.log('Touch detected: end');
    }
}
