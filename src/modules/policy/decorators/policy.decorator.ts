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
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyProtectedActionEmptyException } from '@modules/policy/exceptions/policy.protected-action-empty.exception';
import { PolicyProtectedEmptyException } from '@modules/policy/exceptions/policy.protected-empty.exception';

/**
 * Protects a route, requiring the caller to hold the given policies, and documents policy kits.
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

    return applyDecorators(
        UseGuards(PolicyGuard),
        SetMetadata(PolicyRequiredMetaKey, requiredPolicies),
        DocPolicyErrorResponses.forbidden
    );
}

/**
 * Reads the caller's role policies that `RoleGuard` stored; an empty list is a valid value, and a missing store entry throws `PolicyForbiddenException`, the answer `PolicyGuard` gives a caller with no policies.
 * @public
 */
export const PolicyCurrent = createParamDecorator((): Policy[] => {
    const policies =
        ClsServiceManager.getClsService().get<Policy[] | null>(
            PolicyStoreKey
        ) ?? null;
    if (policies === null) {
        throw new PolicyForbiddenException();
    }

    return policies;
});
