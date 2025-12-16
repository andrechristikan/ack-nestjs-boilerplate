import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { PolicyRequiredAbilityMetaKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityGuard } from '@modules/policy/guards/policy.ability.guard';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';

/**
 * Method decorator that applies policy ability-based protection guards
 * @param {...RoleAbilityRequestDto[]} requiredAbilities - List of policy abilities required for access
 * @returns {MethodDecorator} Combined decorators for policy ability validation
 */
export function PolicyAbilityProtected(
    ...requiredAbilities: RoleAbilityRequestDto[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(PolicyAbilityGuard),
        SetMetadata(PolicyRequiredAbilityMetaKey, requiredAbilities)
    );
}
