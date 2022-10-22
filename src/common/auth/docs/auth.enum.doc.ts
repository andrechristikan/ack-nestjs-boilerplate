import { applyDecorators } from '@nestjs/common';
import { AuthAccessForSerialization } from 'src/common/auth/serializations/auth.access-for.serialization';
import { Doc } from 'src/common/doc/decorators/doc.decorator';

export function AuthEnumAccessForDoc(): any {
    return applyDecorators(
        Doc<AuthAccessForSerialization>('auth.enum.accessFor', {
            response: {
                classSerialization: AuthAccessForSerialization,
            },
        })
    );
}
