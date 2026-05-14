/**
 * 与 `specs/ui-design.md` §6 Motion Tokens 对齐的时长与缓动。
 * M5 落地 `DesignTokens.ts` 后，应改为从该文件再导出或内联合并，避免双源。
 */

/** 秒；对应 `duration-fold` 600 ms */
export const DURATION_FOLD_SEC = 0.6 as const;

/**
 * 将 CSS `cubic-bezier(x1,y1,x2,y2)` 转为 Cocos `Tween` 可用的 `(k: number) => number`。
 *
 * @param k 线性进度 ∈ [0,1]
 * @returns 经曲线映射后的插值因子 ∈ [0,1]
 */
export function cssCubicBezier(x1: number, y1: number, x2: number, y2: number): (k: number) => number {
    return (k: number): number => {
        if (k <= 0) {
            return 0;
        }
        if (k >= 1) {
            return 1;
        }
        let lo = 0;
        let hi = 1;
        let t = 0.5;
        for (let i = 0; i < 14; i += 1) {
            t = (lo + hi) * 0.5;
            const x = _bezierAxis(t, x1, x2);
            if (Math.abs(x - k) < 1e-6) {
                break;
            }
            if (x < k) {
                lo = t;
            } else {
                hi = t;
            }
        }
        return _bezierAxis(t, y1, y2);
    };
}

/** 对应 Token `ease-fold`：`cubic-bezier(0.65, 0, 0.35, 1)` */
export const easeFold = cssCubicBezier(0.65, 0, 0.35, 1);

function _bezierAxis(t: number, c1: number, c2: number): number {
    const u = 1 - t;
    return 3 * u * u * t * c1 + 3 * u * t * t * c2 + t * t * t;
}
