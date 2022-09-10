export interface IUserBulkService {
    deleteMany(find: Record<string, any>): Promise<boolean>;
}
