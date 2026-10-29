export interface IUserMobileNumberAnalyticRepository {
    countVerified(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<number>;
    countAll(startDate: Date | null, endDate: Date | null): Promise<number>;
}
