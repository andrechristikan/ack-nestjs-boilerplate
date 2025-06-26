import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';
import { RequireUserAgreement } from '@modules/term-policy/validations/require-user-consent.validation';

export class TermPolicySignupRequestDto {
    @ApiProperty({
        description:
            'Indicates whether the user accepted the Terms of Service. Must be true.',
        example: true,
    })
    @RequireUserAgreement()
    @IsBoolean()
    [ENUM_TERM_POLICY_TYPE.TERM]: boolean;

    @ApiProperty({
        description:
            'Indicates whether the user accepted the Privacy Policy. Must be true.',
        example: true,
    })
    @IsBoolean()
    @RequireUserAgreement()
    [ENUM_TERM_POLICY_TYPE.PRIVACY]: boolean;

    @ApiProperty({
        description:
            'Indicates whether the user consented to receive marketing communications. Optional.',
        example: false,
        required: false,
    })
    @IsBoolean()
    [ENUM_TERM_POLICY_TYPE.MARKETING]: boolean;

    @ApiProperty({
        description:
            'Indicates whether the user consented to the use of cookies. Optional.',
        example: true,
    })
    @IsBoolean()
    [ENUM_TERM_POLICY_TYPE.COOKIES]: boolean;

    /**
     * Returns a list of policy types that the user has accepted (where value is true)
     * @returns Array of accepted policy types
     */
    getAcceptedPolicyTypes(): ENUM_TERM_POLICY_TYPE[] {
        return Object.entries(this)
            .filter(([_, value]) => value === true)
            .map(([key, _]) => key as ENUM_TERM_POLICY_TYPE);
    }
}
