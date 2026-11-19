import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    IAnalyticDateRange,
    IAnalyticDeviceProliferationResult,
    IAnalyticImpossibleTravel,
    IAnalyticImpossibleTravelThresholds,
    IAnalyticLoginSpikeIp,
    IAnalyticLoginTimeAnomaly,
    IAnalyticLoginTimeAnomalyThresholds,
    IAnalyticNearLockout,
    IAnalyticSnapshotItemInput,
} from '@modules/analytic/interfaces/analytic.interface';

export interface IAnalyticAnomalyRepository {
    findImpossibleTravel(
        range: IAnalyticDateRange,
        thresholds: IAnalyticImpossibleTravelThresholds
    ): Promise<IAnalyticSnapshotItemInput<IAnalyticImpossibleTravel>[]>;
    findDeviceProliferation(
        zScoreThreshold: number
    ): Promise<IAnalyticDeviceProliferationResult>;
    findLoginTimeAnomaly(
        range: IAnalyticDateRange,
        thresholds: IAnalyticLoginTimeAnomalyThresholds
    ): Promise<IAnalyticSnapshotItemInput<IAnalyticLoginTimeAnomaly>[]>;
    countLoginSpikeIp(
        range: IAnalyticDateRange,
        minUniqueAccounts: number
    ): Promise<number>;
    findLoginSpikeIpOffset(
        range: IAnalyticDateRange,
        minUniqueAccounts: number,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticLoginSpikeIp>>;
    countNearLockout(minAttempt: number, now: Date): Promise<number>;
    findNearLockoutOffset(
        minAttempt: number,
        now: Date,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticNearLockout>>;
}
