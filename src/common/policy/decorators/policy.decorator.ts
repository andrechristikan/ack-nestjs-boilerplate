import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import {
    POLICY_ABILITY_META_KEY,
    POLICY_ROLE_META_KEY,
} from 'src/common/policy/constants/policy.constant';
import { ENUM_POLICY_ROLE_TYPE } from 'src/common/policy/constants/policy.enum.constant';
import { PolicyAbilityGuard } from 'src/common/policy/guards/policy.ability.guard';
import { PolicyRoleGuard } from 'src/common/policy/guards/policy.role.guard';
import { IPolicyAbility } from 'src/common/policy/interfaces/policy.interface';

export function PolicyAbilityProtected(
    ...handlers: IPolicyAbility[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(PolicyAbilityGuard),
        SetMetadata(POLICY_ABILITY_META_KEY, handlers)
    );
}

export function PolicyRoleProtected(
    ...roles: ENUM_POLICY_ROLE_TYPE[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(PolicyRoleGuard),
        SetMetadata(POLICY_ROLE_META_KEY, roles)
    );
}
