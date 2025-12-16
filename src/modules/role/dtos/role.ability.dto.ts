import { ApiProperty } from '@nestjs/swagger';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';

export class RoleAbilityDto {
    @ApiProperty({
        required: true,
        description: 'Ability subject',
        enum: EnumPolicySubject,
    })
    subject: EnumPolicySubject;

    @ApiProperty({
        required: true,
        description: 'Ability action base on subject',
        isArray: true,
        default: [EnumPolicyAction.manage],
        enum: EnumPolicyAction,
    })
    action: EnumPolicyAction[];
}
