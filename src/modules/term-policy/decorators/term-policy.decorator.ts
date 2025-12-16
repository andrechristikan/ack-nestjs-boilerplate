import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { TermPolicyRequiredGuardMetaKey } from '@modules/term-policy/constants/term-policy.constant';
import { TermPolicyGuard } from '@modules/term-policy/guards/term-policy.guard';
import { EnumTermPolicyType } from '@prisma/client';

/**
 * Method decorator that applies term policy acceptance protection to routes.
 * Validates if the user has accepted the required term policies before allowing access.
 *
 * @param {...EnumTermPolicyType[]} requiredTermPolicies - List of term policy types that must be accepted
 * @returns {MethodDecorator} Method decorator function
 */
export function TermPolicyAcceptanceProtected(
    ...requiredTermPolicies: EnumTermPolicyType[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(TermPolicyGuard),
        SetMetadata(TermPolicyRequiredGuardMetaKey, requiredTermPolicies)
    );
}
