import { ApiProperty } from '@nestjs/swagger';
import {
    EnumPolicyAction,
    EnumPolicyEffect,
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

    @ApiProperty({
        required: false,
        description: 'Ability effect (allow or deny)',
        enum: EnumPolicyEffect,
        default: EnumPolicyEffect.can,
    })
    effect?: EnumPolicyEffect;

    @ApiProperty({
        required: false,
        description: 'Optional field-level authorization list',
        isArray: true,
        type: String,
    })
    fields?: string[];

    @ApiProperty({
        required: false,
        description: 'Optional CASL conditions object',
        type: Object,
        additionalProperties: true,
    })
    conditions?: Record<string, unknown>;

    @ApiProperty({
        required: false,
        description: 'Optional human-readable reason for rule',
    })
    reason?: string;

    @ApiProperty({
        required: false,
        description: 'Optional priority, lower values are applied first',
        default: 0,
    })
    priority?: number;
}
