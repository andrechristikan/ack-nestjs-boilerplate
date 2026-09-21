import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { TermPolicyRequiredGuardMetaKey } from '@modules/term-policy/constants/term-policy.constant';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';

/**
 * Blocks the route unless the current user has accepted the required term policies.
 */
@Injectable()
export class TermPolicyGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly termPolicyAcceptanceDomain: TermPolicyAcceptanceDomain,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredTermPolicies = this.reflector.get<EnumTermPolicyType[]>(
            TermPolicyRequiredGuardMetaKey,
            context.getHandler()
        );

        const user = this.requestStoreService.get<IUser>(UserStoreKey);
        await this.termPolicyAcceptanceDomain.validateTermPolicyGuard(
            user,
            requiredTermPolicies
        );

        return true;
    }
}
