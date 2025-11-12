import { ApiProperty } from '@nestjs/swagger';
import { ENUM_TERM_POLICY_TYPE } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class TermPolicyAcceptRequestDto {
    @ApiProperty({
        description: 'Type of the terms policy',
        example: ENUM_TERM_POLICY_TYPE.privacy,
        enum: ENUM_TERM_POLICY_TYPE,
        required: true,
    })
    @IsString()
    @IsEnum(ENUM_TERM_POLICY_TYPE)
    @IsNotEmpty()
    readonly type: ENUM_TERM_POLICY_TYPE;
}
