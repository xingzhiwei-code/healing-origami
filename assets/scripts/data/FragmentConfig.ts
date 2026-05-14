import { Vec2, Vec3 } from 'cc';

/**
 * 折叠轴方向。
 *
 * 定义片段绕哪条边折叠，影响 pivot 朝向与背面 UV 镜像轴。
 */
export type FoldAxis = 'left' | 'right' | 'top' | 'bottom' | 'diagonal';

/**
 * SpriteFrame 在纹理中的矩形区域（归一化或像素坐标，由 LevelLoader 统一解析）。
 */
export interface RectUV {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
}

/**
 * 单个可折叠片段的数据配置。
 *
 * 由 LevelLoader 解析关卡数据后通过 `PaperFragment.init()` 注入，
 * 不通过 @property 在 Inspector 手动填写。
 */
export interface FragmentConfig {
    /** 片段唯一标识，用于事件派发与日志。 */
    readonly id: string;

    /** 片段多边形顶点（FragmentRoot 本地坐标系）。 */
    readonly polyPoints: readonly Vec2[];

    /** 旋转支点在 FragmentRoot 本地坐标系中的位置。 */
    readonly pivotPos: Vec2;

    /** 折叠轴朝向，决定背面 UV 的镜像方向。 */
    readonly foldAxis: FoldAxis;

    /** 正确折叠顺序编号，数值越小越先折。 */
    readonly correctOrder: number;

    /** 正面 Sprite 在片段预切图中的 UV 矩形。 */
    readonly frontRect: RectUV;

    /** 背面 Sprite 在完整图中的 UV 矩形（折叠后露出的图案区域）。 */
    readonly backRect: RectUV;
}
