import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@modules/policy/enums/policy.enum';

export class RoleAbilityDto {
    @ApiProperty({
        required: true,
        description: 'Ability subject',
        enum: EnumPolicySubject,
        example: EnumPolicySubject.user,
    })
    @Expose()
    subject: EnumPolicySubject;

    @ApiProperty({
        required: true,
        description: 'Ability action base on subject',
        isArray: true,
        default: [EnumPolicyAction.manage],
        enum: EnumPolicyAction,
        example: [EnumPolicyAction.manage],
    })
    @Expose()
    action: EnumPolicyAction[];
}
