import { _decorator, Component, director } from 'cc';

const { ccclass } = _decorator;

/**
 * 基于 Cocos Component 的常驻节点单例。
 *
 * 适用：需要使用引擎生命周期（`onLoad` / `update` / `lateUpdate`）、
 *      Inspector 注入资源、或挂载在场景节点上的全局管理器，
 *      例如 GameRoot、AudioManager（节点版）、CameraController 等。
 *
 * 设计要点：
 * - 子类通过覆写静态 `getInstance` 来声明强类型；本基类只提供拿到「当前已挂载实例」的能力。
 * - `onLoad` 把自身节点标记为 persistent root，跨场景不销毁；重复挂载会自动销毁后挂载的节点。
 * - `onDestroy` 清理实例引用，避免热重载或显式销毁后引用残留。
 *
 * 用法：
 * ```ts
 * @ccclass('AudioManager')
 * export class AudioManager extends ComponentSingleton<AudioManager> {
 *     public static getInstance(): AudioManager | null {
 *         return ComponentSingleton.getInstanceOf(AudioManager);
 *     }
 * }
 * ```
 */
@ccclass('ComponentSingleton')
export abstract class ComponentSingleton<T extends Component> extends Component {

    /** 各子类的当前实例。键是子类构造函数。 */
    private static readonly _instances: Map<Function, Component> = new Map();

    protected onLoad(): void {
        const ctor = (this as unknown as { constructor: Function }).constructor;
        const existed = ComponentSingleton._instances.get(ctor);
        if (existed && existed !== (this as unknown as Component)) {
            // 已存在同类型实例：销毁后来者，保留先到的，避免双实例。
            // 业务侧应通过 getInstance 拿单例，不应自行重复挂载。
            console.warn(`[ComponentSingleton] duplicate instance of ${ctor.name}, destroying the new one.`);
            this.node.destroy();
            return;
        }
        ComponentSingleton._instances.set(ctor, this as unknown as Component);

        // 标记为持久根节点，跨场景不销毁。要求挂载点是场景根节点。
        if (this.node.parent && this.node.parent === director.getScene()) {
            director.addPersistRootNode(this.node);
        }
    }

    protected onDestroy(): void {
        const ctor = (this as unknown as { constructor: Function }).constructor;
        if (ComponentSingleton._instances.get(ctor) === (this as unknown as Component)) {
            ComponentSingleton._instances.delete(ctor);
        }
    }

    /**
     * 取出指定子类的当前实例。
     *
     * 返回 `null` 表示该单例尚未被挂载到场景中（场景未加载完毕、或未在场景中放置该组件）。
     * 子类应在其静态 `getInstance` 中调用本方法以获得强类型。
     */
    protected static getInstanceOf<C extends Component>(ctor: new (...args: never[]) => C): C | null {
        return (ComponentSingleton._instances.get(ctor) as C | undefined) ?? null;
    }
}
