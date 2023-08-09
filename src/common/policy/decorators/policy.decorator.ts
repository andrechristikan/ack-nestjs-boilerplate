import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { POLICY_RULE_META_KEY } from 'src/common/policy/constants/policy.constant';
import { PolicyGuard } from 'src/common/policy/guards/policy.ability.guard';
import {PolicyRule} from "../models/ploicy-rule.model";

export function PolicyAbilityProtected(
    ...handlers: PolicyRule[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(PolicyGuard),
        SetMetadata(POLICY_RULE_META_KEY, handlers)
    );
}
