import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { DatabaseEntityAbstract } from 'src/common/database/abstracts/database.entity.repository';

export const RoleDatabaseName = 'roles';
export const RoleRepository = 'RoleRepositoryToken';

export class RoleEntity extends DatabaseEntityAbstract {
    name: string;
    permissions: string[];
    isActive: boolean;
    accessFor: ENUM_AUTH_ACCESS_FOR;
}
