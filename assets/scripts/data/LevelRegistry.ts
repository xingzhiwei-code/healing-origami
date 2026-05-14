import { Vec2 } from 'cc';

import { FragmentConfig } from './FragmentConfig';
import type { LevelConfig } from './LevelConfig';

/** 测试关卡 1：左右两半（茶歇·简单几何）。
 *
 * 左半折叠到右半上，correctOrder=1 的左片在 correctOrder=0 的右片之后折。
 * 两个片段共用同一张完整贴图（M2 阶段不区分正反面纹理）。
 */
const LEVEL_1: LevelConfig = {
    levelId: 'tea_01',
    chapterId: 'tea',
    title: '左右对折',
    bgTexture: '',
    paperSize: { w: 360, h: 360 },
    fragments: [
        _half('right', 0),  // 右半，先折（底层）
        _half('left', 1),   // 左半，后折（顶层，折到右半上）
    ],
};

/**
 * 生成半个纸片的 FragmentConfig。
 *
 * @param side 'left' | 'right'，片段在纸张的哪一侧。
 * @param order 折叠顺序（0 = 最先折）。
 */
function _half(side: 'left' | 'right', order: number): FragmentConfig {
    const pw = 360;
    const halfW = pw * 0.5;
    const fullH = 360;

    return {
        id: side,
        polyPoints: side === 'left'
            ? [new Vec2(0, 0), new Vec2(halfW, 0), new Vec2(halfW, fullH), new Vec2(0, fullH)]
            : [new Vec2(halfW, 0), new Vec2(pw, 0), new Vec2(pw, fullH), new Vec2(halfW, fullH)],
        pivotPos: new Vec2(halfW, fullH * 0.5),
        foldAxis: 'right',
        correctOrder: order,
        frontRect: { x: 0, y: 0, w: pw, h: fullH },
        backRect: { x: 0, y: 0, w: pw, h: fullH },
    };
}

/**
 * 关卡注册表（单例）。
 *
 * v1 写死在代码中；v2 改为从 resources/levels/{levelId}.json 加载。
 * 不继承 Singleton 基类（同 EventManager），避开 Cocos 3.8 TS 泛型 this 参数类型冲突。
 */
export class LevelRegistry {

    private static _instance: LevelRegistry | null = null;

    private readonly _levels: Map<string, LevelConfig> = new Map();

    private constructor() {
        this._levels.set(LEVEL_1.levelId, LEVEL_1);
    }

    /** 根据 levelId 获取关卡配置。 */
    public static getInstance(): LevelRegistry {
        if (!LevelRegistry._instance) {
            LevelRegistry._instance = new LevelRegistry();
        }
        return LevelRegistry._instance;
    }

    /** 根据 levelId 获取关卡配置。 */
    public get(levelId: string): LevelConfig | undefined {
        return this._levels.get(levelId);
    }

    /** 获取所有已注册的关卡 ID。 */
    public get allLevelIds(): readonly string[] {
        return Array.from(this._levels.keys());
    }
}
