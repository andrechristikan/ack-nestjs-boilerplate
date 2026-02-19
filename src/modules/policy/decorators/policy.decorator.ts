import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { PolicyAuthorizeMetaKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityGuard } from '@modules/policy/guards/policy.ability.guard';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';
import { IPolicyRequirement } from '@modules/policy/interfaces/policy.interface';
import { EnumPolicyMatch } from '@modules/policy/enums/policy.enum';

type AuthorizeInput = RoleAbilityRequestDto | IPolicyRequirement;

function isRequirement(input: AuthorizeInput): input is IPolicyRequirement {
    return 'rules' in input;
}

/**
 * Decorator that applies CASL authorization requirements to route handlers.
 *
 * Basic usage:
 * @Authorize({ subject: EnumPolicySubject.user, action: [EnumPolicyAction.read] })
 *
 * Advanced usage:
 * @Authorize({
 *   match: EnumPolicyMatch.any,
 *   rules: [
 *     { subject: EnumPolicySubject.user, action: [EnumPolicyAction.read] },
 *     { subject: EnumPolicySubject.role, action: [EnumPolicyAction.read] }
 *   ],
 * })
 */
export function Authorize(
    ...inputs: AuthorizeInput[]
): MethodDecorator & ClassDecorator {
    const useRequirementShape =
        inputs.length > 0 && inputs.every(input => isRequirement(input));
    const requirements: IPolicyRequirement[] =
        inputs.length === 0
            ? []
            : useRequirementShape
              ? (inputs as IPolicyRequirement[]).map(requirement => ({
                    ...requirement,
                    rules: requirement.rules ?? [],
                    match: requirement.match ?? EnumPolicyMatch.all,
                }))
              : [
                    {
                        rules: inputs as RoleAbilityRequestDto[],
                        match: EnumPolicyMatch.all,
                    },
                ];

    return applyDecorators(
        UseGuards(PolicyAbilityGuard),
        SetMetadata(PolicyAuthorizeMetaKey, requirements)
    );
}
