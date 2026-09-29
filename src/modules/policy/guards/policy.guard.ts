import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    PolicyAbilityStoreKey,
    PolicyRequiredMetaKey,
} from '@modules/policy/constants/policy.constant';
import type { IPolicyRequired } from '@modules/policy/interfaces/policy.interface';
import type { IPolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';

/**
 * Enforces the policies declared by `@PolicyProtected` against the request ability. Authentication
 * and membership guards run before this guard and own their corresponding preconditions.
 */
@Injectable()
export class PolicyGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly policyDomain: PolicyDomain,
        private readonly requestStoreService: RequestStoreService
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const ability = this.requestStoreService.get<IPolicyAbility>(
            PolicyAbilityStoreKey
        );
        if (!ability) {
            throw new RequestContextMissingException(PolicyAbilityStoreKey);
        }

        const policyMetadata = this.reflector.get<IPolicyRequired[]>(
            PolicyRequiredMetaKey,
            context.getHandler()
        );
        const requiredPolicies = policyMetadata ?? [];
        if (requiredPolicies.length === 0) {
            throw new PolicyPredefinedNotFoundException();
        }

        for (const { subject, action } of requiredPolicies) {
            for (const one of action) {
                this.policyDomain.assertCan(ability, one, subject);
            }
        }

        return true;
    }
}
