export interface ISettingBulkService {
    deleteMany(find: Record<string, any>): Promise<boolean>;
}
