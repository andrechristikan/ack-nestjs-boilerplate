import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ENUM_TERMS_POLICY_TYPE } from 'src/modules/terms-policy/enums/terms-policy.enum';
import { RequireUserAgreement } from 'src/modules/terms-policy/validations/require-user-consent.validation';

export class TermsPolicySignupRequestDto {
    @ApiProperty({
        description:
            'Indicates whether the user accepted the Terms of Service. Must be true.',
        example: true,
    })
    @RequireUserAgreement()
    @IsBoolean()
    [ENUM_TERMS_POLICY_TYPE.TERMS]: boolean;

    @ApiProperty({
        description:
            'Indicates whether the user accepted the Privacy Policy. Must be true.',
        example: true,
    })
    @IsBoolean()
    @RequireUserAgreement()
    [ENUM_TERMS_POLICY_TYPE.PRIVACY]: boolean;

    @ApiProperty({
        description:
            'Indicates whether the user consented to receive marketing communications. Optional.',
        example: false,
        required: false,
    })
    @IsBoolean()
    [ENUM_TERMS_POLICY_TYPE.MARKETING]: boolean;

    @ApiProperty({
        description:
            'Indicates whether the user consented to the use of cookies. Optional.',
        example: true,
    })
    @IsBoolean()
    [ENUM_TERMS_POLICY_TYPE.COOKIES]: boolean;

    /**
     * Returns a list of policy types that the user has accepted (where value is true)
     * @returns Array of accepted policy types
     */
    getAcceptedPolicyTypes(): ENUM_TERMS_POLICY_TYPE[] {
        return Object.entries(this)
            .filter(([_, value]) => value === true)
            .map(([key, _]) => key as ENUM_TERMS_POLICY_TYPE);
    }
}
