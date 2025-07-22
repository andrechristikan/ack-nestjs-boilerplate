import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { ENUM_POLICY_ROLE_TYPE } from '@modules/policy/enums/policy.enum';
import { TERM_POLICY_ACCEPTANCE_GUARD_META_KEY } from '@modules/term-policy/constants/term-policy.constant';
import { TermPolicyGuard } from '@modules/term-policy/guards/term-policy.guard';

export function TermPolicyAcceptanceProtected(
    ...types: ENUM_POLICY_ROLE_TYPE[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(TermPolicyGuard),
        SetMetadata(TERM_POLICY_ACCEPTANCE_GUARD_META_KEY, types)
    );
}
