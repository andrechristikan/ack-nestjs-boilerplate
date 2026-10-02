import { Injectable } from '@nestjs/common';
import type { CanActivate } from '@nestjs/common';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { Project } from '@generated/prisma-client/client';
import { ProjectPolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import { PolicyDomain } from '@modules/policy/domains/policy.domain';
import { EnumPolicyAbilityScope } from '@modules/policy/enums/policy.enum';
import type { PolicyAbility } from '@modules/policy/interfaces/policy.interface';
import {
    ProjectMemberStoreKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import type { IProjectMemberWithRole } from '@modules/project/interfaces/project.interface';

/**
 * Builds the project layer ability from the acting project member's role rules only (empty when
 * no project member row exists) and stores it under `ProjectPolicyAbilityStoreKey`. It reads no
 * other layer's ability, reuses an ability already stored under its own key, and authorizes
 * nothing.
 */
@Injectable()
export class ProjectAbilityGuard implements CanActivate {
    constructor(
        private readonly policyAbilityDomain: PolicyAbilityDomain,
        private readonly policyDomain: PolicyDomain,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async canActivate(): Promise<boolean> {
        const stored = this.requestStoreService.get<PolicyAbility>(
            ProjectPolicyAbilityStoreKey
        );
        if (stored !== null) {
            return true;
        }

        const project =
            this.policyDomain.requireStored<Project>(ProjectStoreKey);
        const projectMember =
            this.requestStoreService.get<IProjectMemberWithRole>(
                ProjectMemberStoreKey
            );

        let memberRoleId: string | null = null;
        if (projectMember !== null) {
            memberRoleId = projectMember.roleId;
        }

        const ability = await this.policyAbilityDomain.buildAbility({
            scope: EnumPolicyAbilityScope.project,
            project: { id: project.id, memberRoleId },
        });
        this.requestStoreService.set(ProjectPolicyAbilityStoreKey, ability);

        return true;
    }
}
