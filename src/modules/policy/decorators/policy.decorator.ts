import {
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import {
    DocPolicyErrorResponses,
    PolicyRequiredMetaKey,
    PolicyStoreKey,
} from '@modules/policy/constants/policy.constant';
import { PolicyGuard } from '@modules/policy/guards/policy.guard';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import type { Policy } from '@generated/prisma-client/client';
import { hasRequestGuard } from '@common/request/decorators/request.decorator';
import { RequestGuardMissingException } from '@common/request/exceptions/request.guard-missing.exception';
import { RequestProtectedGuardMissingException } from '@common/request/exceptions/request.protected-guard-missing.exception';
import { RoleGuard } from '@modules/role/guards/role.guard';
import { UserGuard } from '@modules/user/guards/user.guard';
import { PolicyProtectedActionEmptyException } from '@modules/policy/exceptions/policy.protected-action-empty.exception';
import { PolicyProtectedEmptyException } from '@modules/policy/exceptions/policy.protected-empty.exception';

/**
 * Protects a route, requiring the caller to hold the given policies, and documents policy kits; throws at decoration when RoleGuard or UserGuard is not applied below it.
 * @public
 */
export function PolicyProtected(
    ...requiredPolicies: PolicyRequestDto[]
): MethodDecorator {
    if (requiredPolicies.length === 0) {
        throw new PolicyProtectedEmptyException();
    }

    if (requiredPolicies.some(policy => policy.action.length === 0)) {
        throw new PolicyProtectedActionEmptyException();
    }

    const decorators = applyDecorators(
        UseGuards(PolicyGuard),
        SetMetadata(PolicyRequiredMetaKey, requiredPolicies),
        DocPolicyErrorResponses.forbidden
    );

    return (target, propertyKey, descriptor): void => {
        if (!hasRequestGuard(descriptor, RoleGuard)) {
            throw new RequestProtectedGuardMissingException(
                'PolicyProtected',
                RoleGuard.name
            );
        }

        if (!hasRequestGuard(descriptor, UserGuard)) {
            throw new RequestProtectedGuardMissingException(
                'PolicyProtected',
                UserGuard.name
            );
        }

        decorators(target, propertyKey, descriptor);
    };
}

/**
 * Reads the caller's role policies that `RoleGuard` stored; an empty list is a valid value, and a missing store entry throws `RequestGuardMissingException`.
 * @public
 */
export const PolicyCurrent = createParamDecorator((): Policy[] => {
    const policies =
        ClsServiceManager.getClsService().get<Policy[] | null>(
            PolicyStoreKey
        ) ?? null;
    if (policies === null) {
        throw new RequestGuardMissingException(PolicyStoreKey);
    }

    return policies;
});
