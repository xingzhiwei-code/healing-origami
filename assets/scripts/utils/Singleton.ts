/**
 * 纯 TypeScript 泛型单例基类。
 *
 * 适用：不依赖 Cocos Component 生命周期的纯数据/逻辑型管理器，
 *      例如 EventManager、WXSDK、DataManager、ConfigManager 等。
 *
 * 设计要点：
 * - 用一张 Map 集中存放各子类实例，避免每个子类各自维护一个 `static _instance`。
 * - `getInstance` 用 `this` 参数承接构造函数类型，子类直接 `XXX.getInstance()` 即可拿到强类型实例。
 * - 子类构造函数声明为 `protected`，强制外部走 `getInstance`，防止误 `new`。
 *
 * 用法：
 * ```ts
 * export class MyManager extends Singleton<MyManager> {
 *     protected constructor() { super(); }
 *     public hello(): void { console.log('hi'); }
 * }
 * MyManager.getInstance().hello();
 * ```
 */
export abstract class Singleton<T> {

    /** 所有子类实例的集中存储，键是子类构造函数。 */
    private static readonly _instances: Map<Function, unknown> = new Map();

    protected constructor() {
        // 仅作可见性约束，禁止外部直接 new；子类需要时显式覆写为 protected。
    }

    /**
     * 获取（或惰性创建）当前子类的唯一实例。
     *
     * 注意：`this` 的类型在静态方法里指向调用者本身（即子类构造函数），
     *      所以无需在子类中重写本方法。
     */
    public static getInstance<T extends Singleton<T>>(this: new () => T): T {
        const ctor = this as unknown as Function;
        let inst = Singleton._instances.get(ctor) as T | undefined;
        if (!inst) {
            inst = new this();
            Singleton._instances.set(ctor, inst);
        }
        return inst;
    }

    /**
     * 销毁当前子类的实例引用（不会自动释放内部资源）。
     *
     * 仅在明确需要重置全局状态（例如登出、切换账号、单元测试）时调用，
     * 子类如有内部缓存需在自身的清理钩子中处理。
     */
    public static destroyInstance<T extends Singleton<T>>(this: new () => T): void {
        Singleton._instances.delete(this as unknown as Function);
    }
}
