import { ApiProperty } from '@nestjs/swagger';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@modules/policy/enums/policy.enum';

export class RoleAbilityDto {
    @ApiProperty({
        required: true,
        description: 'Ability subject',
        enum: ENUM_POLICY_SUBJECT,
    })
    subject: ENUM_POLICY_SUBJECT;

    @ApiProperty({
        required: true,
        description: 'Ability action base on subject',
        isArray: true,
        default: [ENUM_POLICY_ACTION.MANAGE],
        enum: ENUM_POLICY_ACTION,
    })
    action: ENUM_POLICY_ACTION[];
}
