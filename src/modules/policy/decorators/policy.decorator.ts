import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import {
    POLICY_ABILITY_META_KEY,
    POLICY_ROLE_META_KEY,
} from '@modules/policy/constants/policy.constant';
import { ENUM_POLICY_ROLE_TYPE } from '@modules/policy/enums/policy.enum';
import { PolicyAbilityGuard } from '@modules/policy/guards/policy.ability.guard';
import { PolicyRoleGuard } from '@modules/policy/guards/policy.role.guard';
import { IPolicyAbility } from '@modules/policy/interfaces/policy.interface';

export function PolicyAbilityProtected(
    ...abilities: IPolicyAbility[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(PolicyAbilityGuard),
        SetMetadata(POLICY_ABILITY_META_KEY, abilities)
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
