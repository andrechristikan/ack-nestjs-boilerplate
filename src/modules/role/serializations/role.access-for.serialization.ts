import { ApiProperty } from '@nestjs/swagger';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';

export class RoleAccessForSerialization {
    @ApiProperty({
        description: 'Access for role',
        example: [ENUM_AUTH_ACCESS_FOR.USER, ENUM_AUTH_ACCESS_FOR.ADMIN],
        required: true,
    })
    groups: string[];
}
