import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    PolicyContextStoreKey,
    PolicyRequiredMetaKey,
} from '@modules/policy/constants/policy.constant';
import { PolicyGuardMissingException } from '@modules/policy/exceptions/policy.guard-missing.exception';
import type {
    IPolicyContext,
    IPolicyRequired,
} from '@modules/policy/interfaces/policy.interface';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';

@Injectable()
export class PolicyGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly requestStoreService: RequestStoreService,
        private readonly policyAbilityService: PolicyAbilityService
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const handler = context.getHandler();
        const metadata = this.reflector.get<IPolicyRequired[]>(
            PolicyRequiredMetaKey,
            handler
        );
        const required = metadata ?? [];

        const policyContext = this.requestStoreService.get<IPolicyContext>(
            PolicyContextStoreKey
        );
        if (policyContext === null) {
            throw new PolicyGuardMissingException();
        }

        this.policyAbilityService.validatePolicyGuard(policyContext, required);

        return true;
    }
}
