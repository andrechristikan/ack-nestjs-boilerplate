import { applyDecorators } from '@nestjs/common';
import { Doc } from 'src/common/doc/decorators/doc.decorator';
import { RoleAccessForSerialization } from 'src/modules/role/serializations/role.access-for.serialization';

export function RoleEnumAccessForDoc(): MethodDecorator {
    return applyDecorators(
        Doc<RoleAccessForSerialization>('role.enum.accessFor', {
            response: {
                classSerialization: RoleAccessForSerialization,
            },
        })
    );
}
