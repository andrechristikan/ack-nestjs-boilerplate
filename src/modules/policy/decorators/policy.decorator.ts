import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { PolicyRequiredAbilityMetaKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityGuard } from '@modules/policy/guards/policy.ability.guard';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';

/**
 * Protects a route, requiring the caller to hold the given CASL abilities.
 */
export function PolicyAbilityProtected(
    ...requiredAbilities: RoleAbilityRequestDto[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(PolicyAbilityGuard),
        SetMetadata(PolicyRequiredAbilityMetaKey, requiredAbilities)
    );
}
