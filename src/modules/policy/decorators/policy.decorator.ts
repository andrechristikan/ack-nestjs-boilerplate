import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { PolicyRequiredMetaKey } from '@modules/policy/constants/policy.constant';
import { PolicyGuard } from '@modules/policy/guards/policy.guard';
import { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';

/**
 * Protects a route, requiring the caller to hold the given policies.
 */
export function PolicyProtected(
    ...requiredPolicies: PolicyRequestDto[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(PolicyGuard),
        SetMetadata(PolicyRequiredMetaKey, requiredPolicies)
    );
}
