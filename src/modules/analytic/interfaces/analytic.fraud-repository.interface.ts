import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    IAnalyticAccountTakeover,
    IAnalyticCredentialStuffing,
    IAnalyticDateRange,
    IAnalyticForgotPasswordAbuse,
    IAnalyticFraudRiskScore,
    IAnalyticMassRegistration,
    IAnalyticPasswordResetEnumeration,
    IAnalyticRiskScoreOptions,
    IAnalyticSessionAfterAdmin,
    IAnalyticSharedFingerprint,
    IAnalyticSnapshotItem,
    IAnalyticSnapshotItemInput,
} from '@modules/analytic/interfaces/analytic.interface';

export interface IAnalyticFraudRepository {
    countCredentialStuffing(
        range: IAnalyticDateRange,
        minUniqueAccounts: number
    ): Promise<number>;
    findCredentialStuffingOffset(
        range: IAnalyticDateRange,
        minUniqueAccounts: number,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticCredentialStuffing>>;
    countAccountTakeover(
        range: IAnalyticDateRange,
        newDeviceAfterPasswordChangeInMs: number
    ): Promise<number>;
    findAccountTakeoverOffset(
        range: IAnalyticDateRange,
        newDeviceAfterPasswordChangeInMs: number,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticAccountTakeover>>;
    countSessionAfterAdmin(
        range: IAnalyticDateRange,
        sessionAfterAdminRevokeInMs: number
    ): Promise<number>;
    findSessionAfterAdminOffset(
        range: IAnalyticDateRange,
        sessionAfterAdminRevokeInMs: number,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticSessionAfterAdmin>>;
    findSharedFingerprints(
        minUsersPerFingerprint: number
    ): Promise<IAnalyticSharedFingerprint[]>;
    countMassRegistration(
        range: IAnalyticDateRange,
        minAccountsPerIp: number
    ): Promise<number>;
    findMassRegistrationOffset(
        range: IAnalyticDateRange,
        minAccountsPerIp: number,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticMassRegistration>>;
    countPasswordResetEnumeration(
        range: IAnalyticDateRange,
        minRequestsPerIp: number
    ): Promise<number>;
    findPasswordResetEnumerationOffset(
        range: IAnalyticDateRange,
        minRequestsPerIp: number,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticPasswordResetEnumeration>>;
    countForgotPasswordAbuse(
        range: IAnalyticDateRange,
        minUnusedTokens: number
    ): Promise<number>;
    findForgotPasswordAbuseOffset(
        range: IAnalyticDateRange,
        minUnusedTokens: number,
        params: IPaginationQueryOffsetParams
    ): Promise<IResponsePaginationReturn<IAnalyticForgotPasswordAbuse>>;
    findRiskScoreByUser(
        userId: string
    ): Promise<IAnalyticSnapshotItem<IAnalyticFraudRiskScore> | null>;
    findRiskScoreCandidates(
        options: IAnalyticRiskScoreOptions
    ): Promise<IAnalyticSnapshotItemInput<IAnalyticFraudRiskScore>[]>;
}
