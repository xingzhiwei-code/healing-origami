import { _decorator, Component, Prefab, instantiate, Node, SpriteFrame, Texture2D } from 'cc';

import { LevelRegistry } from '../data/LevelRegistry';
import type { LevelConfig } from '../data/LevelConfig';
import { FragmentConfig } from '../data/FragmentConfig';
import { PaperFragment } from '../core/PaperFragment';
import { EventManager, GameEvents } from '../utils/EventManager';

const { ccclass, property } = _decorator;

/**
 * LevelRunner · 关卡运行器。
 *
 * 挂在场景根节点（如 Canvas）上，负责：
 * 1. 从 LevelRegistry 加载关卡配置；
 * 2. 为每个 FragmentConfig 实例化 FragmentPrefab 并注入数据；
 * 3. 完成后派发 `level.load.done` 事件。
 *
 * M2 阶段：关卡数据写死在 LevelRegistry 中，贴图暂用同一张。
 */
@ccclass('LevelRunner')
export class LevelRunner extends Component {

    @property({
        tooltip: '关卡 ID，对应 LevelRegistry.get() 的 key',
    })
    public levelId: string = 'tea_01';

    @property({
        type: Prefab,
        tooltip: 'FragmentPrefab（PaperFragment 组件的预制体）',
    })
    public fragmentPrefab: Prefab | null = null;

    /** 放置片段的父节点。 */
    @property({
        type: Node,
        tooltip: '放置所有纸片片段的父节点',
    })
    public paperRoot: Node | null = null;

    protected start(): void {
        const config = LevelRegistry.getInstance().get(this.levelId);
        if (!config) {
            console.error(`[LevelRunner] 关卡 "${this.levelId}" 未注册`);
            return;
        }
        if (!this.fragmentPrefab) {
            console.error('[LevelRunner] fragmentPrefab 未配置');
            return;
        }
        if (!this.paperRoot) {
            console.error('[LevelRunner] paperRoot 未配置');
            return;
        }

        this._loadLevel(config);
    }

    private _loadLevel(config: LevelConfig): void {
        EventManager.getInstance().emit(GameEvents.LEVEL_START, { levelId: config.levelId });

        const pw = config.paperSize.w;
        const ph = config.paperSize.h;

        // 猫 demo：用 1x1 白色 SpriteFrame + Sprite.color 着色
        const whiteSF = this._createWhiteSpriteFrame();

        for (const frag of config.fragments) {
            const fragNode = this._instantiateFragment(frag, whiteSF, pw, ph);
            this.paperRoot!.addChild(fragNode);
        }

        console.log(`[LevelRunner] 关卡 "${config.title}" 加载完成，${config.fragments.length} 个片段`);
        EventManager.getInstance().emit(GameEvents.LEVEL_COMPLETE, {
            levelId: config.levelId,
            stars: 0,
            durationMs: 0,
        });
    }

    /** 创建 1x1 白色 SpriteFrame，用于纯色着色。 */
    private _createWhiteSpriteFrame(): SpriteFrame {
        const tex = new Texture2D();
        tex.reset({ width: 1, height: 1 });
        const sf = new SpriteFrame();
        sf.texture = tex;
        return sf;
    }

    private _instantiateFragment(config: FragmentConfig, sharedSF: SpriteFrame, pw: number, ph: number): Node {
        const fragNode = instantiate(this.fragmentPrefab!);
        fragNode.name = `Fragment_${config.id}`;

        const paperFrag = fragNode.getComponent(PaperFragment);
        if (!paperFrag) {
            console.warn(`[LevelRunner] Fragment_${config.id} 没有 PaperFragment 组件`);
            return fragNode;
        }

        // 用 polyPoints 的 AABB 中心作为片段在场景中的位置
        const { polyPoints } = config;
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const p of polyPoints) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }
        const centerX = (minX + maxX) * 0.5 - pw * 0.5;
        const centerY = (minY + maxY) * 0.5 - ph * 0.5;
        fragNode.setPosition(centerX, centerY, 0);

        paperFrag.init(config, sharedSF);

        return fragNode;
    }
}
