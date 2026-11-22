export interface IAuthCommonPasswordRepository {
    existsByValue(value: string): Promise<boolean>;
}
