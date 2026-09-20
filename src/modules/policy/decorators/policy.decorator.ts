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
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import type { Policy } from '@generated/prisma-client/client';

/**
 * Protects a route, requiring the caller to hold the given policies, and documents policy kits.
 * @public
 */
export function PolicyProtected(
    ...requiredPolicies: PolicyRequestDto[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(PolicyGuard),
        SetMetadata(PolicyRequiredMetaKey, requiredPolicies),
        DocPolicyErrorResponses.forbidden,
        DocPolicyErrorResponses.predefinedNotFound
    );
}

/**
 * Reads the caller's role policies that `RoleGuard` stored; an empty list is a valid value, and a missing store entry throws.
 * @public
 */
export const PolicyCurrent = createParamDecorator((): Policy[] => {
    const policies = ClsServiceManager.getClsService().get<
        Policy[] | undefined
    >(PolicyStoreKey);
    if (policies === undefined || policies === null) {
        throw new RequestContextMissingException(PolicyStoreKey);
    }

    return policies;
});
