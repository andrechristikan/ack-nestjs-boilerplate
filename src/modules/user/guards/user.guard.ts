import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { UserDomain } from '@modules/user/domains/user.domain';
import { Reflector } from '@nestjs/core';
import {
    UserGuardIsVerifiedMetaKey,
    UserStoreKey,
} from '@modules/user/constants/user.constant';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IUserWithoutPolicies } from '@modules/user/interfaces/user.interface';

/** Validates the authenticated user, stores it without role policies, and resolves the request ability. */
@Injectable()
export class UserGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly userDomain: UserDomain,
        private readonly policyAbilityFactory: PolicyAbilityFactory,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isVerifiedRequired = this.reflector.get<boolean>(
            UserGuardIsVerifiedMetaKey,
            context.getHandler()
        );
        const isVerified = isVerifiedRequired ?? false;

        const request = context.switchToHttp().getRequest<IRequestApp>();

        const user = await this.userDomain.validateUserGuard(
            request.user?.userId ?? null,
            isVerified
        );

        const { policies, ...role } = user.role;
        const userWithoutPolicies: IUserWithoutPolicies = {
            ...user,
            role,
        };

        this.requestStoreService.set(UserStoreKey, userWithoutPolicies);
        const ability = this.policyAbilityFactory.buildFromPolicies(policies, {
            user: userWithoutPolicies,
            workspace: null,
            workspaceMember: null,
            project: null,
            projectMember: null,
        });
        this.requestStoreService.set(PolicyAbilityStoreKey, ability);

        return true;
    }
}
