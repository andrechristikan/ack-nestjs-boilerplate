import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import {
    PolicyProtectedDocErrors,
    PolicyRequiredMetaKey,
} from '@modules/policy/constants/policy.constant';
import { PolicyGuard } from '@modules/policy/guards/policy.guard';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import { DocErrors } from '@common/doc/decorators/doc.decorator';
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
