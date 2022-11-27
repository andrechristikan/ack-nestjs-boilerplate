import { PaginationFilterEnum } from 'src/common/pagination/decorators/pagination.decorator';
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';
import { PERMISSION_DEFAULT_GROUP } from 'src/modules/permission/constants/permission.list.constant';

export class PermissionGroupDto {
    @PaginationFilterEnum(PERMISSION_DEFAULT_GROUP, ENUM_PERMISSION_GROUP)
    readonly group: string[];
}
