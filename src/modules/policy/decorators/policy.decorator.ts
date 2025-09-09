import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { POLICY_ABILITY_META_KEY } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityGuard } from '@modules/policy/guards/policy.ability.guard';
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
