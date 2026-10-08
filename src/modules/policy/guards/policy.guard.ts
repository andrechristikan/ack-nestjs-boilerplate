import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PolicyRequiredMetaKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';
import type { IPolicyRequired } from '@modules/policy/interfaces/policy.interface';

@Injectable()
export class PolicyGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly policyAbilityDomain: PolicyAbilityDomain
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const required = this.reflector.get<IPolicyRequired[] | undefined>(
            PolicyRequiredMetaKey,
            context.getHandler()
        );
        if (!required || required.length === 0) {
            throw new PolicyPredefinedNotFoundException();
        }

        this.policyAbilityDomain.assertCanEvery(required);

        return true;
    }
}
