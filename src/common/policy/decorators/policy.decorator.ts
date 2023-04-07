import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { POLICY_RULE_META_KEY } from 'src/common/policy/constants/policy.constant';
import { PolicyGuard } from 'src/common/policy/guards/policy.ability.guard';
import { IPolicyRule } from 'src/common/policy/interfaces/policy.interface';

export function PolicyAbilityProtected(
    ...handlers: IPolicyRule[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(PolicyGuard),
        SetMetadata(POLICY_RULE_META_KEY, handlers)
    );
}
