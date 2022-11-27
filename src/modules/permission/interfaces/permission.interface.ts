import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';

export interface IPermissionGroup {
    group: ENUM_PERMISSION_GROUP;
    permissions: PermissionEntity[];
}
