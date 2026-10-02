import { Injectable } from '@nestjs/common';
import type { CanActivate } from '@nestjs/common';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { PlatformPolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { EnumPolicyAbilityScope } from '@modules/policy/enums/policy.enum';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import type { IUser } from '@modules/user/interfaces/user.interface';

/**
 * Builds the platform ability from the caller's platform-role policies and stores it under
 * `PlatformPolicyAbilityStoreKey`. It needs only the authenticated user, reuses an ability already
 * stored under its own key, and authorizes nothing.
 */
@Injectable()
export class PlatformAbilityGuard implements CanActivate {
    constructor(
        private readonly policyAbilityDomain: PolicyAbilityDomain,
        private readonly policyDomain: PolicyDomain,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(): Promise<boolean> {
        const stored = this.requestStoreService.get<PolicyAbility>(
            PlatformPolicyAbilityStoreKey
        );
        if (stored !== null) {
            return true;
        }

        const user = this.policyDomain.requireStored<IUser>(UserStoreKey);

        const ability = await this.policyAbilityDomain.buildAbility({
            scope: EnumPolicyAbilityScope.platform,
            user: { id: user.id, roleId: user.roleId },
        });
        this.requestStoreService.set(PlatformPolicyAbilityStoreKey, ability);

        return true;
    }
}
