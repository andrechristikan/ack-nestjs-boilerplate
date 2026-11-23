import {
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import {
    PolicyContextStoreKey,
    PolicyProtectedDocErrors,
    PolicyRequiredMetaKey,
} from '@modules/policy/constants/policy.constant';
import { PolicyAbilityGuard } from '@modules/policy/guards/policy.ability.guard';
import { PolicyGuard } from '@modules/policy/guards/policy.guard';
import type {
    IPolicyContext,
    IPolicyRequired,
} from '@modules/policy/interfaces/policy.interface';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { DocErrors } from '@common/doc/decorators/doc.decorator';
import { PolicyProtectedActionEmptyException } from '@modules/policy/exceptions/policy.protected-action-empty.exception';
import { PolicyProtectedEmptyException } from '@modules/policy/exceptions/policy.protected-empty.exception';

/** @public */
export function PolicyProtected(
    ...requirements: IPolicyRequired[]
): MethodDecorator {
    if (requirements.length === 0) {
        throw new PolicyProtectedEmptyException();
    }

    if (requirements.some(requirement => requirement.action.length === 0)) {
        throw new PolicyProtectedActionEmptyException();
    }

    return applyDecorators(
        UseGuards(PolicyAbilityGuard, PolicyGuard),
        SetMetadata(PolicyRequiredMetaKey, requirements),
        DocErrors(...PolicyProtectedDocErrors)
    );
}

/** @public */
export function PolicyAbilityProtected(): MethodDecorator {
    return applyDecorators(
        UseGuards(PolicyAbilityGuard),
        DocErrors(...PolicyProtectedDocErrors)
    );
}

/** @public */
export const PolicyContext = createParamDecorator((): IPolicyContext => {
    const stored =
        ClsServiceManager.getClsService().get<IPolicyContext | null>(
            PolicyContextStoreKey
        ) ?? null;
    if (stored === null) {
        throw new RequestContextMissingException(PolicyContextStoreKey);
    }

    return stored;
});
