import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import type { EnumPolicySubject } from '@generated/prisma-client/client';
import {
    DocPolicyErrorResponses,
    PolicyRequiredMetaKey,
} from '@modules/policy/constants/policy.constant';
import { PolicyAbilityGuard } from '@modules/policy/guards/policy.ability.guard';
import { PolicyGuard } from '@modules/policy/guards/policy.guard';
import type { IPolicyRequired } from '@modules/policy/interfaces/policy.interface';

/** Builds the request ability and enforces the declared subject/action policies. */
export function PolicyProtected(
    ...requirements: IPolicyRequired<EnumPolicySubject>[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(PolicyAbilityGuard, PolicyGuard),
        SetMetadata(PolicyRequiredMetaKey, requirements),
        DocPolicyErrorResponses.forbidden,
        DocPolicyErrorResponses.predefinedNotFound
    );
}

/** Builds the request ability without declaring a policy requirement. */
export function PolicyAbility(): MethodDecorator {
    return applyDecorators(UseGuards(PolicyAbilityGuard));
}
