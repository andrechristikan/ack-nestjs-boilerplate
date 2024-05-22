import { ApiProperty } from '@nestjs/swagger';
import { ENUM_POLICY_ROLE_TYPE } from 'src/common/policy/constants/policy.enum.constant';

export class UserLoginResponseDto {
    @ApiProperty({
        example: 'Bearer',
        required: true,
        nullable: false,
    })
    readonly tokenType: string;

    @ApiProperty({
        example: ENUM_POLICY_ROLE_TYPE.USER,
        enum: ENUM_POLICY_ROLE_TYPE,
        required: true,
        nullable: false,
    })
    readonly roleType: ENUM_POLICY_ROLE_TYPE;

    @ApiProperty({
        example: 3600,
        description: 'timestamp in minutes',
        required: true,
        nullable: false,
    })
    readonly expiresIn: number;

    @ApiProperty({
        required: true,
        nullable: false,
    })
    readonly accessToken: string;

    @ApiProperty({
        required: true,
        nullable: false,
    })
    readonly refreshToken: string;
}
