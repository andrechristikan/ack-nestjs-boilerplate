import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { PolicyRequiredMetaKey } from '@modules/policy/constants/policy.constant';
import type { IPolicyRequired } from '@modules/policy/interfaces/policy.interface';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import type { IUser } from '@modules/user/interfaces/user.interface';

/**
 * Enforces the policies declared by `@PolicyProtected` against the request ability. Keeps an
 * explicit user check ahead of the metadata and ability work as a defense-in-depth measure on
 * this auth-adjacent guard, even though the auth guard chain already runs first.
 */
@Injectable()
export class PolicyGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly policyDomain: PolicyDomain,
        private readonly requestStoreService: RequestStoreService
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const user = this.requestStoreService.get<IUser>(UserStoreKey);
        if (!user) {
            throw new AuthJwtAccessTokenInvalidException();
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
                this.policyDomain.assertCan(one, subject);
            }
        }

        return true;
    }
}
