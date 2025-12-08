import { ApiProperty } from '@nestjs/swagger';
import { ENUM_TERM_POLICY_TYPE } from '@prisma/client';

export class UserTermPolicyDto {
    @ApiProperty({
        required: true,
        description: 'Terms of Service acceptance',
        example: true,
    })
    [ENUM_TERM_POLICY_TYPE.termsOfService]: boolean;

    @ApiProperty({
        required: true,
        description: 'Privacy Policy acceptance',
        example: true,
    })
    [ENUM_TERM_POLICY_TYPE.privacy]: boolean;

    @ApiProperty({
        required: true,
        description: 'Cookie Policy acceptance',
        example: true,
    })
    [ENUM_TERM_POLICY_TYPE.cookies]: boolean;

    @ApiProperty({
        required: true,
        description: 'Marketing Policy acceptance',
        example: false,
    })
    [ENUM_TERM_POLICY_TYPE.marketing]: boolean;
}
