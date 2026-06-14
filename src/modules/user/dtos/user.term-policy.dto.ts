import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { EnumTermPolicyType } from '@generated/prisma-client';

export class UserTermPolicyDto {
    @ApiProperty({
        required: true,
        description: 'Terms of Service acceptance',
        example: true,
    })
    @Expose()
    [EnumTermPolicyType.termsOfService]: boolean;

    @ApiProperty({
        required: true,
        description: 'Privacy Policy acceptance',
        example: true,
    })
    @Expose()
    [EnumTermPolicyType.privacy]: boolean;

    @ApiProperty({
        required: true,
        description: 'Cookie Policy acceptance',
        example: true,
    })
    @Expose()
    [EnumTermPolicyType.cookies]: boolean;

    @ApiProperty({
        required: true,
        description: 'Marketing Policy acceptance',
        example: false,
    })
    @Expose()
    [EnumTermPolicyType.marketing]: boolean;
}
