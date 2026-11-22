import { UserContextStoreKey } from '@modules/user/constants/user.constant';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
    PolicyRequiredMetaKey,
    PolicyStoreKey,
} from '@modules/policy/constants/policy.constant';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import { PolicyService } from '@modules/policy/services/policy.service';
import { PolicyGuardMissingException } from '@modules/policy/exceptions/policy.guard-missing.exception';
import { UserGuardMissingException } from '@modules/user/exceptions/user.guard-missing.exception';
import type { Policy } from '@generated/prisma-client/client';
import { RequestStoreService } from '@common/request/services/request.store.service';

@Injectable()
export class PolicyGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly policyService: PolicyService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const policyMetadata = this.reflector.get<PolicyRequestDto[]>(
            PolicyRequiredMetaKey,
            context.getHandler()
        );
        const requiredPolicies = policyMetadata ?? [];

        const userContext =
            this.requestStoreService.get<IUserContext>(UserContextStoreKey);
        const user = userContext?.user ?? null;
        if (user === null) {
            throw new UserGuardMissingException();
        }

        const policies = this.requestStoreService.get<Policy[]>(PolicyStoreKey);
        if (!policies) {
            throw new PolicyGuardMissingException();
        }

        return this.policyService.validatePolicyGuard(
            user,
            policies,
            requiredPolicies
        );
    }
}
