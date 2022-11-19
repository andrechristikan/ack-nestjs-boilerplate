import { ApiProperty } from '@nestjs/swagger';
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';

export class PermissionGroupSerialization {
    @ApiProperty({
        enum: ENUM_PERMISSION_GROUP,
        type: 'array',
        isArray: true,
    })
    group: ENUM_PERMISSION_GROUP[];
}
