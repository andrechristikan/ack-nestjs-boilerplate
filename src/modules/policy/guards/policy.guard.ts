import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
    PolicyRequiredMetaKey,
    PolicyStoreKey,
} from '@modules/policy/constants/policy.constant';
import { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import { PolicyService } from '@modules/policy/services/policy.service';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import { IUser } from '@modules/user/interfaces/user.interface';
import { Policy } from '@generated/prisma-client';
import { RequestStoreService } from '@common/request/services/request.store.service';

/**
 * Enforces the policies declared by `@PolicyProtected` against the request user.
 */
@Injectable()
export class PolicyGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly policyService: PolicyService,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPolicies =
            this.reflector.get<PolicyRequestDto[]>(
                PolicyRequiredMetaKey,
                context.getHandler()
            ) ?? [];

        const user = this.requestStoreService.get<IUser>(UserStoreKey);
        const policies = this.requestStoreService.get<Policy[]>(PolicyStoreKey);
        return this.policyService.validatePolicyGuard(
            user,
            policies,
            requiredPolicies
        );
    }
}
