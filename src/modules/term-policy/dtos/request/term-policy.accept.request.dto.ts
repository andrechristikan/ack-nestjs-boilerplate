import { ApiProperty } from '@nestjs/swagger';
import { EnumTermPolicyType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class TermPolicyAcceptRequestDto {
    @ApiProperty({
        description: 'Type of the terms policy',
        example: EnumTermPolicyType.privacy,
        enum: EnumTermPolicyType,
        required: true,
    })
    @IsString()
    @IsEnum(EnumTermPolicyType)
    @IsNotEmpty()
    readonly type: EnumTermPolicyType;
}
