import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
    PolicyAbilityStoreKey,
    PolicyRequiredMetaKey,
} from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';
import type {
    IPolicyRequired,
    PolicyAbility,
} from '@modules/policy/interfaces/policy.interface';

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

        const ability = this.policyAbilityDomain.requireStored<PolicyAbility>(
            PolicyAbilityStoreKey
        );
        for (const { subject, action } of required) {
            for (const one of action) {
                this.policyAbilityDomain.assertCan(ability, one, subject);
            }
        }

        return true;
    }
}
