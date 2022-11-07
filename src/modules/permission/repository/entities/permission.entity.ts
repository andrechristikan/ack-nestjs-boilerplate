import { DatabaseEntityAbstract } from 'src/common/database/abstracts/database.entity.repository';

export const PermissionDatabaseName = 'permissions';
export const PermissionRepository = 'PermissionRepositoryToken';

export class PermissionEntity extends DatabaseEntityAbstract {
    code: string;
    name: string;
    description: string;
    isActive: boolean;
}
