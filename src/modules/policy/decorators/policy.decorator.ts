import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import {
    POLICY_ABILITY_META_KEY,
    POLICY_ROLE_META_KEY,
} from '@modules/policy/constants/policy.constant';
import { ENUM_POLICY_ROLE_TYPE } from '@modules/policy/enums/policy.enum';
import { PolicyAbilityGuard } from '@modules/policy/guards/policy.ability.guard';
import { PolicyRoleGuard } from '@modules/policy/guards/policy.role.guard';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';

/**
 * Method decorator that applies policy ability-based protection guards
 * @param {...RoleAbilityRequestDto[]} abilities - List of policy abilities required for access
 * @returns {MethodDecorator} Combined decorators for policy ability validation
 */
export function PolicyAbilityProtected(
    ...abilities: RoleAbilityRequestDto[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(PolicyAbilityGuard),
        SetMetadata(POLICY_ABILITY_META_KEY, abilities)
    );
}

/**
 * Method decorator that applies policy role-based protection guards
 * @param {...ENUM_POLICY_ROLE_TYPE[]} roles - List of policy role types required for access
 * @returns {MethodDecorator} Combined decorators for policy role validation
 */
export function PolicyRoleProtected(
    ...roles: ENUM_POLICY_ROLE_TYPE[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(PolicyRoleGuard),
        SetMetadata(POLICY_ROLE_META_KEY, roles)
    );
}
