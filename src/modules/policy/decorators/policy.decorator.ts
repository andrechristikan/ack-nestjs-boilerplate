import {
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import {
    PolicyProtectedDocErrors,
    PolicyRequiredMetaKey,
    PolicyStoreKey,
} from '@modules/policy/constants/policy.constant';
import { PolicyGuard } from '@modules/policy/guards/policy.guard';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import type { Policy } from '@generated/prisma-client/client';
import { DocErrors } from '@common/doc/decorators/doc.decorator';
import { PolicyGuardMissingException } from '@modules/policy/exceptions/policy.guard-missing.exception';
import { PolicyProtectedActionEmptyException } from '@modules/policy/exceptions/policy.protected-action-empty.exception';
import { PolicyProtectedEmptyException } from '@modules/policy/exceptions/policy.protected-empty.exception';

/** @public */
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
        DocErrors(...PolicyProtectedDocErrors)
    );
}

/** @public */
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
