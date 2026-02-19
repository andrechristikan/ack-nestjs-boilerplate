import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { PolicyAuthorizeMetaKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityGuard } from '@modules/policy/guards/policy.ability.guard';
import {
    IPolicyRequirement,
    IPolicyRule,
} from '@modules/policy/interfaces/policy.interface';
import { EnumPolicyMatch } from '@modules/policy/enums/policy.enum';

type AuthorizeInput = IPolicyRule | IPolicyRequirement;

function isRequirement(input: AuthorizeInput): input is IPolicyRequirement {
    return 'rules' in input && Array.isArray((input as IPolicyRequirement).rules);
}

/**
 * Decorator that applies CASL authorization requirements to route handlers.
 *
 * Basic usage:
 * @PolicyAbilityProtected({ subject: EnumPolicySubject.user, action: [EnumPolicyAction.read] })
 *
 * Advanced usage:
 * @PolicyAbilityProtected({
 *   match: EnumPolicyMatch.any,
 *   rules: [
 *     { subject: EnumPolicySubject.user, action: [EnumPolicyAction.read] },
 *     { subject: EnumPolicySubject.role, action: [EnumPolicyAction.read] }
 *   ],
 * })
 */
export function PolicyAbilityProtected(
    ...inputs: [AuthorizeInput, ...AuthorizeInput[]]
): MethodDecorator & ClassDecorator {
    const useRequirementShape = inputs.every(input => isRequirement(input));
    const requirements: IPolicyRequirement[] = useRequirementShape
        ? (inputs as IPolicyRequirement[]).map(requirement => ({
              ...requirement,
              rules: requirement.rules ?? [],
              match: requirement.match ?? EnumPolicyMatch.all,
          }))
        : [
              {
                  rules: inputs as IPolicyRule[],
                  match: EnumPolicyMatch.all,
              },
          ];

    return applyDecorators(
        UseGuards(PolicyAbilityGuard),
        SetMetadata(PolicyAuthorizeMetaKey, requirements)
    );
}
