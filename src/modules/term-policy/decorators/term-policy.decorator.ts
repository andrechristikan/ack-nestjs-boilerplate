import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { TERM_POLICY_ACCEPTANCE_GUARD_META_KEY } from '@modules/term-policy/constants/term-policy.constant';
import { TermPolicyGuard } from '@modules/term-policy/guards/term-policy.guard';
import { ENUM_TERM_POLICY_TYPE } from '@modules/term-policy/enums/term-policy.enum';

export function TermPolicyAcceptanceProtected(
    ...types: ENUM_TERM_POLICY_TYPE[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(TermPolicyGuard),
        SetMetadata(TERM_POLICY_ACCEPTANCE_GUARD_META_KEY, types)
    );
}
