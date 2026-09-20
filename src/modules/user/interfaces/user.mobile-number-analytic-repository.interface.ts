export interface IUserMobileNumberAnalyticRepository {
    countVerified(): Promise<number>;
    countAll(): Promise<number>;
}
