import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import {
    TermPolicyAcceptanceProtectedDocErrors,
    TermPolicyRequiredGuardMetaKey,
} from '@modules/term-policy/constants/term-policy.constant';
import { TermPolicyGuard } from '@modules/term-policy/guards/term-policy.guard';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { DocErrors } from '@common/doc/decorators/doc.decorator';

/** @public */
export function TermPolicyAcceptanceProtected(
    ...requiredTermPolicies: EnumTermPolicyType[]
): MethodDecorator {
    return applyDecorators(
        UseGuards(TermPolicyGuard),
        SetMetadata(TermPolicyRequiredGuardMetaKey, requiredTermPolicies),
        DocErrors(...TermPolicyAcceptanceProtectedDocErrors)
    );
}
