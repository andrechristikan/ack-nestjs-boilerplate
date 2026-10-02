import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import {
    DocPolicyErrorResponses,
    PolicyRequiredMetaKey,
} from '@modules/policy/constants/policy.constant';
import { EnumPolicyPlatformSubject } from '@modules/policy/enums/policy.enum';
import { PolicyAbilityGuard } from '@modules/policy/guards/policy.ability.guard';
import { PolicyGuard } from '@modules/policy/guards/policy.guard';
import type {
    IPolicyRequired,
    PolicySubject,
} from '@modules/policy/interfaces/policy.interface';

/** Builds the request ability and enforces the declared subject/action policies. */
export function PolicyProtected<TSubject extends PolicySubject>(
    ...requirements: IPolicyRequired<TSubject>[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(PolicyAbilityGuard, PolicyGuard),
        SetMetadata(PolicyRequiredMetaKey, requirements),
        DocPolicyErrorResponses.forbidden,
        DocPolicyErrorResponses.predefinedNotFound
    );
}

/** Builds the request ability without declaring a policy requirement. */
export function PolicyAbilityProtected(): MethodDecorator {
    return applyDecorators(UseGuards(PolicyAbilityGuard));
}

export function PlatformPolicyProtected(
    ...requirements: IPolicyRequired<EnumPolicyPlatformSubject>[]
): MethodDecorator {
    return PolicyProtected(...requirements);
}
