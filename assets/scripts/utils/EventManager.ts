/** 事件回调函数签名，payload 类型由调用方在 `on`/`emit` 时显式给出。 */
export type EventHandler<P = unknown> = (payload: P) => void;

interface HandlerEntry {
    readonly cb: EventHandler<unknown>;
    readonly target?: unknown;
    readonly once: boolean;
}

/**
 * 全局事件总线（单例）。
 *
 * 用于跨模块、跨场景的松耦合通信。业务模块禁止互相 import，
 * 一律通过 `EventManager.getInstance().emit(GameEvents.XXX, payload)` 派发。
 *
 * 设计要点：
 * - 用 `target` 区分同一回调挂在不同对象上的情况（典型场景：同一组件类的多个实例）。
 * - `once` 在触发后自动从集合中移除。
 * - `emit` 期间用快照遍历，避免回调中 `off` 引发迭代异常。
 * - 事件名只允许取自 `GameEvents` 常量，不接受裸字符串（编译期无法强制，靠代码评审保证）。
 *
 * 注：不继承 Singleton 基类，因为 Cocos 3.8 TypeScript 对泛型单例的 `this` 参数约束
 *    与 `protected constructor` 存在类型冲突。此处手写单例更干净。
 */
export class EventManager {

    private static _instance: EventManager | null = null;

    private readonly _handlers: Map<string, Set<HandlerEntry>> = new Map();

    private constructor() {}

    /** 获取唯一实例。 */
    public static getInstance(): EventManager {
        if (!EventManager._instance) {
            EventManager._instance = new EventManager();
        }
        return EventManager._instance;
    }

    /** 订阅事件。同一 `cb + target` 组合不会重复注册。 */
    public on<P = unknown>(event: string, cb: EventHandler<P>, target?: unknown): void {
        this._add(event, cb as EventHandler<unknown>, target, false);
    }

    /** 订阅一次，触发后自动解绑。 */
    public once<P = unknown>(event: string, cb: EventHandler<P>, target?: unknown): void {
        this._add(event, cb as EventHandler<unknown>, target, true);
    }

    /**
     * 解绑事件。
     * - 同时传 `cb` 与 `target`：精确解绑该对组合
     * - 只传 `cb`：解绑该回调（任意 target）
     * - 只传 `target`：解绑该 target 上的所有该事件回调
     * - 全省略：解绑该事件的全部监听
     */
    public off(event: string, cb?: EventHandler<unknown>, target?: unknown): void {
        const bucket = this._handlers.get(event);
        if (!bucket) return;
        if (!cb && target === undefined) {
            bucket.clear();
            return;
        }
        for (const entry of Array.from(bucket)) {
            const cbMatch = cb ? entry.cb === cb : true;
            const targetMatch = target !== undefined ? entry.target === target : true;
            if (cbMatch && targetMatch) {
                bucket.delete(entry);
            }
        }
    }

    /** 派发事件。payload 类型由调用方约定，建议在 `GameEvents` 旁注释。 */
    public emit<P = unknown>(event: string, payload?: P): void {
        const bucket = this._handlers.get(event);
        if (!bucket || bucket.size === 0) return;
        const snapshot = Array.from(bucket);
        for (const entry of snapshot) {
            try {
                if (entry.target) {
                    entry.cb.call(entry.target, payload as unknown);
                } else {
                    entry.cb(payload as unknown);
                }
            } catch (err) {
                console.error(`[EventManager] handler of "${event}" threw:`, err);
            }
            if (entry.once) bucket.delete(entry);
        }
    }

    /** 清空全部事件，或清空指定事件的所有监听。 */
    public clear(event?: string): void {
        if (event) {
            this._handlers.delete(event);
        } else {
            this._handlers.clear();
        }
    }

    private _add(event: string, cb: EventHandler<unknown>, target: unknown, once: boolean): void {
        let bucket = this._handlers.get(event);
        if (!bucket) {
            bucket = new Set<HandlerEntry>();
            this._handlers.set(event, bucket);
        }
        for (const entry of bucket) {
            if (entry.cb === cb && entry.target === target) return;
        }
        bucket.add({ cb, target, once });
    }
}

/**
 * 集中事件名常量。
 *
 * 约束：
 * - 新增事件必须先在此注册并在注释中写明 payload 类型；
 * - 业务代码只能引用本对象的字段，禁止裸写事件名字符串。
 */
export const GameEvents = {
    // ---------- 游戏流程 ----------
    /** payload: { levelId: string } */
    LEVEL_START: 'level.start',
    /** payload: { levelId: string; stars: number; durationMs: number } */
    LEVEL_COMPLETE: 'level.complete',
    /** payload: { levelId: string; reason: 'timeout' | 'quit' } */
    LEVEL_FAIL: 'level.fail',

    // ---------- 折纸交互 ----------
    /** payload: { pieceId: string; gridX: number; gridY: number } */
    PIECE_PLACED: 'piece.placed',
    /** payload: { pieceId: string } */
    PIECE_PICKED: 'piece.picked',
    /** payload: { pieceId: string } */
    PIECE_FOLDED: 'piece.folded',
    /**
     * 折纸滑动手势进行中（每帧/每次 TOUCH_MOVE 派发）。
     * payload: FoldingPayload —— 见 assets/scripts/core/FoldController.ts
     */
    GAME_EVENT_FOLDING: 'game.folding',

    // ---------- 折叠会话（M1-e 新增） ----------
    /** payload: { fragmentId: string } */
    FRAGMENT_FOLD_BEGIN: 'fragment.fold.begin',
    /** payload: { fragmentId: string; angleDeg: number } */
    FRAGMENT_FOLD_PROGRESS: 'fragment.fold.progress',
    /** payload: { fragmentId: string } */
    FRAGMENT_FOLD_COMMIT: 'fragment.fold.commit',
    /** payload: { fragmentId: string; reason: 'release' | 'order-conflict' } */
    FRAGMENT_FOLD_REVERT: 'fragment.fold.revert',

    // ---------- 经济与道具 ----------
    /** payload: { type: 'coin' | 'star'; delta: number; total: number } */
    CURRENCY_CHANGED: 'currency.changed',
    /** payload: { itemId: string } */
    HINT_USED: 'item.hint.used',

    // ---------- 广告 / 平台 ----------
    /** payload: { adUnitId: string; isEnded: boolean } */
    AD_REWARDED: 'ad.rewarded',
    /** payload: { adUnitId: string } */
    AD_FAILED: 'ad.failed',

    // ---------- UI ----------
    /** payload: { panel: string } */
    UI_PANEL_OPEN: 'ui.panel.open',
    /** payload: { panel: string } */
    UI_PANEL_CLOSE: 'ui.panel.close',
} as const;

export type GameEventName = typeof GameEvents[keyof typeof GameEvents];
