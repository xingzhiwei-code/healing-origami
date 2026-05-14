import type { FragmentConfig } from './FragmentConfig';

/** 章节标识。 */
export type ChapterId = 'tea' | 'letter' | 'childhood' | 'travel';

/**
 * 关卡数据配置。
 *
 * 描述一关所需的全部信息：章节归属、标题、背景贴图、纸张尺寸、片段列表。
 * v1 写死在代码中，v2 改为从 resources/levels/{levelId}.json 加载。
 */
export interface LevelConfig {
    /** 关卡唯一标识。 */
    readonly levelId: string;

    /** 所属章节。 */
    readonly chapterId: ChapterId;

    /** 关卡显示标题。 */
    readonly title: string;

    /** 背景纹理资源路径（如 'textures/levels/tea/level_01_bg'）。 */
    readonly bgTexture: string;

    /** 纸张尺寸（逻辑像素，与设计分辨率 720×1280 对齐）。 */
    readonly paperSize: { readonly w: number; readonly h: number };

    /** 该关卡包含的可折叠片段。 */
    readonly fragments: readonly FragmentConfig[];

    /** 通关庆祝动效标识（可选）。 */
    readonly celebrateAnim?: string;
}
