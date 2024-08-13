import { ApiProperty } from '@nestjs/swagger';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';

export class AuthLoginResponseDto {
    @ApiProperty({
        example: 'Bearer',
        required: true,
        nullable: false,
    })
    tokenType: string;

    @ApiProperty({
        example: ENUM_POLICY_ROLE_TYPE.USER,
        enum: ENUM_POLICY_ROLE_TYPE,
        required: true,
        nullable: false,
    })
    roleType: ENUM_POLICY_ROLE_TYPE;

    @ApiProperty({
        example: 3600,
        description: 'timestamp in minutes',
        required: true,
        nullable: false,
    })
    expiresIn: number;

    @ApiProperty({
        required: true,
        nullable: false,
    })
    accessToken: string;

    @ApiProperty({
        required: true,
        nullable: false,
    })
    refreshToken: string;
}
