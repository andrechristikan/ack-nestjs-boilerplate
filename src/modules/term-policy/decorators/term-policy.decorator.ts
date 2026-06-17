import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { TermPolicyRequiredGuardMetaKey } from '@modules/term-policy/constants/term-policy.constant';
import { TermPolicyGuard } from '@modules/term-policy/guards/term-policy.guard';
import { EnumTermPolicyType } from '@generated/prisma-client';

/**
 * Guards a route until the user has accepted the given term policy types.
 * No types defaults to terms-of-service and privacy in the guard.
 */
export function TermPolicyAcceptanceProtected(
    ...requiredTermPolicies: EnumTermPolicyType[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(TermPolicyGuard),
        SetMetadata(TermPolicyRequiredGuardMetaKey, requiredTermPolicies)
    );
}
