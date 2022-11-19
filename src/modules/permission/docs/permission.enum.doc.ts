import { applyDecorators } from '@nestjs/common';
import { Doc } from 'src/common/doc/decorators/doc.decorator';
import { PermissionGroupSerialization } from 'src/modules/permission/serializations/permission.group.serialization';

export function PermissionEnumGroupDoc(): MethodDecorator {
    return applyDecorators(
        Doc<PermissionGroupSerialization>('permission.enum.group', {
            response: {
                classSerialization: PermissionGroupSerialization,
            },
        })
    );
}
