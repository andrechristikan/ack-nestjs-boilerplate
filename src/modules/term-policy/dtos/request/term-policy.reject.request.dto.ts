import { PickType, ApiProperty } from '@nestjs/swagger';
import { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class TermPolicyRejectRequestDto extends PickType(
    TermPolicyCreateRequestDto,
    ['country' ]
) {
    @ApiProperty({
        description: 'Type of the terms policy',
        example: ENUM_TERM_POLICY_TYPE.COOKIES,
        enum: ENUM_TERM_POLICY_TYPE,
        required: true,
    })
    @IsEnum([ENUM_TERM_POLICY_TYPE.COOKIES, ENUM_TERM_POLICY_TYPE.MARKETING])
    @IsNotEmpty()
    readonly type: ENUM_TERM_POLICY_TYPE;
}
