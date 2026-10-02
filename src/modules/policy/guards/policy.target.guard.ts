import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { EnumPolicySubject } from '@generated/prisma-client/client';
import {
    PolicyAbilityScopeMetaKey,
    PolicyRequiredMetaKey,
} from '@modules/policy/constants/policy.constant';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import type { EnumPolicyAbilityScope } from '@modules/policy/enums/policy.enum';
import { PolicyPredefinedNotFoundException } from '@modules/policy/exceptions/policy.predefined-not-found.exception';
import type {
    IPolicyRequired,
    PolicyTargetResolverRegistry,
} from '@modules/policy/interfaces/policy.interface';
import { PolicyUtil } from '@modules/policy/utils/policy.util';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Shared enforcement of the three scope policy guards: composes the ability of the scope the
 * decorator declares, then judges every required `{ subject, action }`. A subject with a resolver
 * whose source is available (it answers a record) is judged as a tagged record and the record is
 * stored under the resolver's store key; any other subject is judged by type only.
 */
export abstract class PolicyTargetGuard<TSubject extends EnumPolicySubject>
    implements CanActivate
{
    protected abstract readonly resolvers: PolicyTargetResolverRegistry<TSubject>;

    constructor(
        protected readonly reflector: Reflector,
        protected readonly policyDomain: PolicyDomain,
        protected readonly policyUtil: PolicyUtil,
        protected readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const scope = this.reflector.get<EnumPolicyAbilityScope | undefined>(
            PolicyAbilityScopeMetaKey,
            context.getHandler()
        );
        if (scope === undefined) {
            throw new PolicyPredefinedNotFoundException();
        }

        const declared = this.reflector.get<
            IPolicyRequired<TSubject>[] | undefined
        >(PolicyRequiredMetaKey, context.getHandler());
        const requiredPolicies = declared ?? [];
        if (requiredPolicies.length === 0) {
            throw new PolicyPredefinedNotFoundException();
        }

        const ability = this.policyDomain.requireComposedAbility(scope);
        const request = context.switchToHttp().getRequest<IRequestApp>();

        for (const { subject, action } of requiredPolicies) {
            const resolver = this.resolvers[subject];
            for (const one of action) {
                if (resolver === undefined) {
                    this.policyDomain.assertCan(ability, one, subject);
                    continue;
                }

                const target = await resolver.resolve(request, ability, one);
                if (target === null) {
                    this.policyDomain.assertCan(ability, one, subject);
                    continue;
                }

                const tagged = this.policyUtil.toSubject(subject, target);
                this.policyDomain.assertCan(ability, one, tagged);
                if (resolver.storeKey !== null) {
                    this.requestStoreService.set(resolver.storeKey, target);
                }
            }
        }

        return true;
    }
}
