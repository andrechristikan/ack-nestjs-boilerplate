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
import { DocUserErrorResponses } from '@modules/user/constants/user.constant';
import { PolicyGuardMissingException } from '@modules/policy/exceptions/policy.guard-missing.exception';
import { PolicyProtectedActionEmptyException } from '@modules/policy/exceptions/policy.protected-action-empty.exception';
import { PolicyProtectedEmptyException } from '@modules/policy/exceptions/policy.protected-empty.exception';

/**
 * Protects a route, requiring the caller to hold the given policies, and documents policy kits and the missing user and policy stores.
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
        DocPolicyErrorResponses.forbidden,
        DocUserErrorResponses.guardMissing,
        DocPolicyErrorResponses.guardMissing
    );
}

/**
 * Reads the caller's role policies that `RoleGuard` stored; an empty list is a valid value, and a missing store entry throws `PolicyGuardMissingException`.
 * @public
 */
export const PolicyCurrent = createParamDecorator((): Policy[] => {
    const policies =
        ClsServiceManager.getClsService().get<Policy[] | null>(
            PolicyStoreKey
        ) ?? null;
    if (policies === null) {
        throw new PolicyGuardMissingException();
    }

    return policies;
});
