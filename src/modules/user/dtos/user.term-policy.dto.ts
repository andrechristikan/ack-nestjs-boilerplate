import { ApiProperty } from '@nestjs/swagger';
import { EnumTermPolicyType } from '@prisma/client';

export class UserTermPolicyDto {
    @ApiProperty({
        required: true,
        description: 'Terms of Service acceptance',
        example: true,
    })
    [EnumTermPolicyType.termsOfService]: boolean;

    @ApiProperty({
        required: true,
        description: 'Privacy Policy acceptance',
        example: true,
    })
    [EnumTermPolicyType.privacy]: boolean;

    @ApiProperty({
        required: true,
        description: 'Cookie Policy acceptance',
        example: true,
    })
    [EnumTermPolicyType.cookies]: boolean;

    @ApiProperty({
        required: true,
        description: 'Marketing Policy acceptance',
        example: false,
    })
    [EnumTermPolicyType.marketing]: boolean;
}
