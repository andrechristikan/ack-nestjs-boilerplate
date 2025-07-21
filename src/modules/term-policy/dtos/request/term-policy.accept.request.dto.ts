import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';

export class TermPolicyAcceptRequestDto {
    @ApiProperty({
        required: true,
        enum: Object.values(ENUM_TERM_POLICY_TYPE),
    })
    @IsEnum(ENUM_TERM_POLICY_TYPE)
    @IsNotEmpty()
    type: ENUM_TERM_POLICY_TYPE;
}
