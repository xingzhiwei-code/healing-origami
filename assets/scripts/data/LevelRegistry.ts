import { Vec2 } from 'cc';

import { FragmentConfig } from './FragmentConfig';
import type { LevelConfig } from './LevelConfig';

/** Design Tokens 中的颜色（HEX）。 */
const C_SAGE = '#7FA37A';   // 茶绿 → 身体
const C_CLAY = '#D9A38B';   // 陶土 → 头部
const C_WHEAT = '#E6D194';  // 麦黄 → 耳朵
const C_MIST = '#B5C7D3';   // 雾蓝 → 尾巴

/**
 * 简笔猫（猫的身体（基座，不折叠）。
 */
function _body(): FragmentConfig {
    // 身体是基座，rect 宽 160×高 120，中心在 (0,0)
    return {
        id: 'body',
        displayName: '身体',
        frontColor: C_SAGE,
        // polyPoints 定义多边形顶点（FragmentRoot 本地坐标系）
        // 身体是猫的主体，宽矩形
        polyPoints: [
            new Vec2(-80, -60), new Vec2(80, -60),
            new Vec2(80, 60),   new Vec2(-80, 60),
        ],
        pivotPos: new Vec2(0, -60),   // 折叠轴在身体顶部边缘
        foldAxis: 'top',
        correctOrder: 0,
        frontRect: { x: 0, y: 0, w: 160, h: 120 },
        backRect: { x: 0, y: 0, w: 160, h: 120 },
    };
}

/** 猫的头部（折到身体上）。 */
function _head(): FragmentConfig {
    return {
        id: 'head',
        displayName: '头部',
        frontColor: C_CLAY,
        // 头部是梯形（上窄下宽），贴在身体上面
        polyPoints: [
            new Vec2(-40, 0),   new Vec2(40, 0),
            new Vec2(50, 50),   new Vec2(-50, 50),
        ],
        pivotPos: new Vec2(0, 0),
        foldAxis: 'bottom',
        correctOrder: 1,
        frontRect: { x: 0, y: 0, w: 100, h: 50 },
        backRect: { x: 0, y: 0, w: 100, h: 50 },
    };
}

/** 猫的耳朵（折到头部上）。 */
function _ears(): FragmentConfig {
    return {
        id: 'ears',
        displayName: '耳朵',
        frontColor: C_WHEAT,
        // 耳朵是倒 V 形（上宽下窄），像猫耳朵
        polyPoints: [
            new Vec2(-30, 0),  new Vec2(30, 0),
            new Vec2(40, -30), new Vec2(0, -10),
            new Vec2(-40, -30),
        ],
        pivotPos: new Vec2(0, 0),
        foldAxis: 'bottom',
        correctOrder: 2,
        frontRect: { x: 0, y: 0, w: 80, h: 30 },
        backRect: { x: 0, y: 0, w: 80, h: 30 },
    };
}

/** 猫的尾巴（折到身体右侧）。 */
function _tail(): FragmentConfig {
    return {
        id: 'tail',
        displayName: '尾巴',
        frontColor: C_MIST,
        // 尾巴是细长条，贴在身体右侧
        polyPoints: [
            new Vec2(0, -50),  new Vec2(20, -50),
            new Vec2(20, 50),  new Vec2(0, 50),
        ],
        pivotPos: new Vec2(0, 0),
        foldAxis: 'right',
        correctOrder: 3,
        frontRect: { x: 0, y: 0, w: 20, h: 100 },
        backRect: { x: 0, y: 0, w: 20, h: 100 },
    };
}

/** 测试关卡 1：简笔猫（茶歇·简单几何）。
 *
 * 4 个碎片散开分布，折叠后拼成一只简笔猫。
 * 颜色按身体部位区分（茶绿=身体 / 陶土=头 / 麦黄=耳朵 / 雾蓝=尾巴）。
 *
 * 折叠顺序：
 *  1. 身体（基座，不折叠，correctOrder=0）
 *  2. 头部折到身体上（correctOrder=1）
 *  3. 耳朵折到头部上（correctOrder=2）
 *  4. 尾巴折到身体右侧（correctOrder=3）
 */
const LEVEL_1: LevelConfig = {
    levelId: 'tea_01',
    chapterId: 'tea',
    title: '简笔猫',
    bgTexture: '',
    paperSize: { w: 360, h: 400 },
    fragments: [
        _body(),
        _head(),
        _ears(),
        _tail(),
    ],
};

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
