import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import {
    DocTermPolicyErrorResponses,
    TermPolicyRequiredGuardMetaKey,
} from '@modules/term-policy/constants/term-policy.constant';
import { TermPolicyGuard } from '@modules/term-policy/guards/term-policy.guard';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { hasRequestGuard } from '@common/request/decorators/request.decorator';
import { RequestProtectedGuardMissingException } from '@common/request/exceptions/request.protected-guard-missing.exception';
import { UserGuard } from '@modules/user/guards/user.guard';

/**
 * Guards a route until the user has accepted the given term policy types.
 * No types defaults to terms-of-service and privacy.
 * Throws at decoration when UserGuard is not applied below it.
 * @public
 */
export function TermPolicyAcceptanceProtected(
    ...requiredTermPolicies: EnumTermPolicyType[]
): MethodDecorator {
    const decorators = applyDecorators(
        UseGuards(TermPolicyGuard),
        SetMetadata(TermPolicyRequiredGuardMetaKey, requiredTermPolicies),
        DocTermPolicyErrorResponses.forbidden
    );

    return (target, propertyKey, descriptor): void => {
        if (!hasRequestGuard(descriptor, UserGuard)) {
            throw new RequestProtectedGuardMissingException(
                'TermPolicyAcceptanceProtected',
                UserGuard.name
            );
        }

        decorators(target, propertyKey, descriptor);
    };
}
