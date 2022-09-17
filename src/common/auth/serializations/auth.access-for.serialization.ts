import { ApiProperty } from '@nestjs/swagger';
import { ENUM_AUTH_ACCESS_FOR_DEFAULT } from 'src/common/auth/constants/auth.enum.constant';

export class AuthAccessForSerialization {
    @ApiProperty({
        enum: ENUM_AUTH_ACCESS_FOR_DEFAULT,
        type: 'array',
        isArray: true,
    })
    accessFor: ENUM_AUTH_ACCESS_FOR_DEFAULT[];
}
