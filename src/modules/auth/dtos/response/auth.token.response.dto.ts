import { ApiProperty } from '@nestjs/swagger';
import { ENUM_POLICY_ROLE_TYPE } from '@modules/policy/enums/policy.enum';

/**
 * Response DTO for authentication token containing token information and user role
 */
export class AuthTokenResponseDto {
    @ApiProperty({
        example: 'Bearer',
        required: true,
    })
    tokenType: string;

    @ApiProperty({
        example: ENUM_POLICY_ROLE_TYPE.USER,
        enum: ENUM_POLICY_ROLE_TYPE,
        type: String,
        required: true,
    })
    roleType: ENUM_POLICY_ROLE_TYPE;

    @ApiProperty({
        example: 3600,
        description: 'timestamp in minutes',
        required: true,
    })
    expiresIn: number;

    @ApiProperty({
        required: true,
    })
    accessToken: string;

    @ApiProperty({
        required: true,
    })
    refreshToken: string;
}
