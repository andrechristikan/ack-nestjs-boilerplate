import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
    PolicyRequiredMetaKey,
    PolicyStoreKey,
} from '@modules/policy/constants/policy.constant';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import type { IUser } from '@modules/user/interfaces/user.interface';
import type { Policy } from '@generated/prisma-client/client';
import { RequestStoreService } from '@common/request/services/request.store.service';

/**
 * Enforces the policies declared by `@PolicyProtected` against the request user.
 */
@Injectable()
export class PolicyGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly policyDomain: PolicyDomain,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const policyMetadata = this.reflector.get<PolicyRequestDto[]>(
            PolicyRequiredMetaKey,
            context.getHandler()
        );
        const requiredPolicies = policyMetadata ?? [];

        const user = this.requestStoreService.get<IUser>(UserStoreKey);
        const policies = this.requestStoreService.get<Policy[]>(PolicyStoreKey);
        return this.policyDomain.validatePolicyGuard(
            user,
            policies,
            requiredPolicies
        );
    }
}
