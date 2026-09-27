import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import {
    DocPolicyErrorResponses,
    PolicyRequiredMetaKey,
} from '@modules/policy/constants/policy.constant';
import { PolicyGuard } from '@modules/policy/guards/policy.guard';
import type { IPolicyRequired } from '@modules/policy/interfaces/policy.interface';

/**
 * Protects a route, requiring the caller to hold the given policies, and documents policy kits.
 * The guard judges the request-scoped ability, which is composed from the workspace and project
 * guards' store entries, so this decorator sits above `@WorkspaceProtected` / `@ProjectProtected`
 * and the member guards: decorators apply bottom to top, so the policy guard then runs after them.
 * @public
 */
export function PolicyProtected(
    ...requiredPolicies: IPolicyRequired[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(PolicyGuard),
        SetMetadata(PolicyRequiredMetaKey, requiredPolicies),
        DocPolicyErrorResponses.forbidden,
        DocPolicyErrorResponses.predefinedNotFound
    );
}
