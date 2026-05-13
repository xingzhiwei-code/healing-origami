import { Singleton } from '../utils/Singleton';

/**
 * 微信小游戏全局对象的最小类型描述。
 *
 * 不引入 `@types/weapp` 体量，仅描述本封装需要的字段；
 * 业务侧不直接读取此类型，对外只暴露 WXSDK 的方法。
 */
interface WxRewardedVideoAd {
    load(): Promise<void>;
    show(): Promise<void>;
    onLoad(cb: () => void): void;
    offLoad(cb: () => void): void;
    onError(cb: (err: { errMsg: string; errCode: number }) => void): void;
    offError(cb: (err: { errMsg: string; errCode: number }) => void): void;
    onClose(cb: (res: { isEnded: boolean }) => void): void;
    offClose(cb: (res: { isEnded: boolean }) => void): void;
    destroy?(): void;
}

interface WxInterstitialAd {
    load(): Promise<void>;
    show(): Promise<void>;
    onError(cb: (err: { errMsg: string; errCode: number }) => void): void;
    offError(cb: (err: { errMsg: string; errCode: number }) => void): void;
    onClose(cb: () => void): void;
    offClose(cb: () => void): void;
    destroy?(): void;
}

interface WxCloudInstance {
    init(opts: { env: string; traceUser?: boolean }): void;
    callFunction<T = unknown>(opts: { name: string; data?: object }): Promise<{ result: T }>;
    uploadFile(opts: { cloudPath: string; filePath: string }): Promise<{ fileID: string }>;
    downloadFile(opts: { fileID: string }): Promise<{ tempFilePath: string }>;
}

interface WxGlobal {
    vibrateShort(opts?: { type?: 'heavy' | 'medium' | 'light'; success?: () => void; fail?: () => void }): void;
    vibrateLong(opts?: { success?: () => void; fail?: () => void }): void;
    createRewardedVideoAd(opts: { adUnitId: string }): WxRewardedVideoAd;
    createInterstitialAd(opts: { adUnitId: string }): WxInterstitialAd;
    cloud: WxCloudInstance;
}

declare const wx: WxGlobal | undefined;

/** 激励广告调用结果。 */
export interface RewardedAdResult {
    /** 广告流程是否成功展示并关闭（非 wx 环境视为成功）。 */
    readonly success: boolean;
    /** 用户是否完整观看完毕（决定是否发奖）。非 wx 环境默认 true 以方便联调。 */
    readonly isEnded: boolean;
}

/**
 * 微信小游戏 SDK 统一适配层。
 *
 * 设计要点：
 * - 所有 `wx.*` 调用必须经过本类；业务层只看到 `Promise` 与稳定类型。
 * - 非 wx 环境（编辑器预览 / H5 / 单元测试）统一走 mock 分支：
 *   `console.warn('[WXSDK] mock: xxx')` + 立即 resolve，业务无需做环境判断。
 * - 激励 / 插屏广告实例按 `adUnitId` 缓存，避免每次重新创建（小游戏官方建议）。
 *
 * 当前所有真实接入点均为最小空实现，需要接入时在对应方法内填充逻辑，
 * 业务层无需改动调用方式。
 */
export class WXSDK extends Singleton<WXSDK> {

    private _cloudInited = false;
    private readonly _rewardedAds: Map<string, WxRewardedVideoAd> = new Map();
    private readonly _interstitialAds: Map<string, WxInterstitialAd> = new Map();

    protected constructor() {
        super();
    }

    // ---------------------------------------------------------------------
    // 环境检测
    // ---------------------------------------------------------------------

    /** 当前是否运行于微信小游戏环境。 */
    public isWX(): boolean {
        return typeof wx !== 'undefined';
    }

    // ---------------------------------------------------------------------
    // 震动
    // ---------------------------------------------------------------------

    /** 短震动（约 15ms）。 */
    public vibrateShort(type: 'heavy' | 'medium' | 'light' = 'light'): Promise<void> {
        if (!this.isWX()) {
            console.warn('[WXSDK] mock: vibrateShort');
            return Promise.resolve();
        }
        return new Promise<void>((resolve, reject) => {
            (wx as WxGlobal).vibrateShort({
                type,
                success: () => resolve(),
                fail: () => reject(new Error('vibrateShort failed')),
            });
        });
    }

    /** 长震动（约 400ms）。 */
    public vibrateLong(): Promise<void> {
        if (!this.isWX()) {
            console.warn('[WXSDK] mock: vibrateLong');
            return Promise.resolve();
        }
        return new Promise<void>((resolve, reject) => {
            (wx as WxGlobal).vibrateLong({
                success: () => resolve(),
                fail: () => reject(new Error('vibrateLong failed')),
            });
        });
    }

    // ---------------------------------------------------------------------
    // 广告：激励视频
    // ---------------------------------------------------------------------

    /**
     * 展示激励视频广告。
     *
     * 非 wx 环境：返回 `{ success: true, isEnded: true }`，便于本地联调奖励逻辑。
     *
     * TODO(@platform): 接入埋点上报、广告加载失败重试策略。
     */
    public showRewardedAd(adUnitId: string): Promise<RewardedAdResult> {
        if (!this.isWX()) {
            console.warn(`[WXSDK] mock: showRewardedAd(${adUnitId})`);
            return Promise.resolve({ success: true, isEnded: true });
        }

        let ad = this._rewardedAds.get(adUnitId);
        if (!ad) {
            ad = (wx as WxGlobal).createRewardedVideoAd({ adUnitId });
            this._rewardedAds.set(adUnitId, ad);
        }
        const adInstance = ad;

        return new Promise<RewardedAdResult>((resolve) => {
            const cleanup = (): void => {
                adInstance.offClose(onClose);
                adInstance.offError(onError);
            };
            const onClose = (res: { isEnded: boolean }): void => {
                cleanup();
                resolve({ success: true, isEnded: !!res?.isEnded });
            };
            const onError = (err: { errMsg: string; errCode: number }): void => {
                cleanup();
                console.warn('[WXSDK] rewarded ad error:', err);
                resolve({ success: false, isEnded: false });
            };
            adInstance.onClose(onClose);
            adInstance.onError(onError);
            adInstance.show().catch(() => {
                // 首次未加载完成时 show 会失败，先 load 再 show
                adInstance.load().then(() => adInstance.show()).catch((err) => {
                    cleanup();
                    console.warn('[WXSDK] rewarded ad load/show error:', err);
                    resolve({ success: false, isEnded: false });
                });
            });
        });
    }

    // ---------------------------------------------------------------------
    // 广告：插屏
    // ---------------------------------------------------------------------

    /** 展示插屏广告。返回是否成功展示。 */
    public showInterstitialAd(adUnitId: string): Promise<boolean> {
        if (!this.isWX()) {
            console.warn(`[WXSDK] mock: showInterstitialAd(${adUnitId})`);
            return Promise.resolve(true);
        }

        let ad = this._interstitialAds.get(adUnitId);
        if (!ad) {
            ad = (wx as WxGlobal).createInterstitialAd({ adUnitId });
            this._interstitialAds.set(adUnitId, ad);
        }
        const adInstance = ad;

        return new Promise<boolean>((resolve) => {
            const cleanup = (): void => {
                adInstance.offClose(onClose);
                adInstance.offError(onError);
            };
            const onClose = (): void => {
                cleanup();
                resolve(true);
            };
            const onError = (err: { errMsg: string; errCode: number }): void => {
                cleanup();
                console.warn('[WXSDK] interstitial ad error:', err);
                resolve(false);
            };
            adInstance.onClose(onClose);
            adInstance.onError(onError);
            adInstance.show().catch((err: unknown) => {
                cleanup();
                console.warn('[WXSDK] interstitial show error:', err);
                resolve(false);
            });
        });
    }

    // ---------------------------------------------------------------------
    // 云开发
    // ---------------------------------------------------------------------

    /** 初始化云开发环境，重复调用会被忽略。 */
    public cloudInit(env: string): Promise<void> {
        if (!this.isWX()) {
            console.warn(`[WXSDK] mock: cloudInit(${env})`);
            this._cloudInited = true;
            return Promise.resolve();
        }
        if (this._cloudInited) return Promise.resolve();
        try {
            (wx as WxGlobal).cloud.init({ env, traceUser: true });
            this._cloudInited = true;
            return Promise.resolve();
        } catch (err) {
            return Promise.reject(err);
        }
    }

    /** 调用云函数。返回云函数 `result` 字段，由调用方约定泛型 `T`。 */
    public cloudCall<T = unknown>(name: string, data?: object): Promise<T> {
        if (!this.isWX()) {
            console.warn(`[WXSDK] mock: cloudCall(${name})`, data);
            return Promise.resolve({} as T);
        }
        if (!this._cloudInited) {
            return Promise.reject(new Error('[WXSDK] cloudCall before cloudInit'));
        }
        return (wx as WxGlobal).cloud.callFunction<T>({ name, data }).then((res) => res.result);
    }

    /** 上传文件到云存储。返回 `fileID`。 */
    public cloudUpload(cloudPath: string, filePath: string): Promise<string> {
        if (!this.isWX()) {
            console.warn(`[WXSDK] mock: cloudUpload(${cloudPath}, ${filePath})`);
            return Promise.resolve(`mock://cloud/${cloudPath}`);
        }
        if (!this._cloudInited) {
            return Promise.reject(new Error('[WXSDK] cloudUpload before cloudInit'));
        }
        return (wx as WxGlobal).cloud.uploadFile({ cloudPath, filePath }).then((res) => res.fileID);
    }

    /** 下载云文件。返回本地临时路径。 */
    public cloudDownload(fileID: string): Promise<string> {
        if (!this.isWX()) {
            console.warn(`[WXSDK] mock: cloudDownload(${fileID})`);
            return Promise.resolve(`mock://local/${fileID}`);
        }
        if (!this._cloudInited) {
            return Promise.reject(new Error('[WXSDK] cloudDownload before cloudInit'));
        }
        return (wx as WxGlobal).cloud.downloadFile({ fileID }).then((res) => res.tempFilePath);
    }
}
