import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    PolicyAbilityStoreKey,
    PolicyStoreKey,
    ProjectMemberPolicyStoreKey,
    WorkspaceMemberPolicyStoreKey,
    abilitySubjectOf,
} from '@modules/policy/constants/policy.constant';
import {
    ProjectMemberStoreKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import {
    WorkspaceMemberStoreKey,
    WorkspaceStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import { PolicyImmutableException } from '@modules/policy/exceptions/policy.immutable.exception';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import { PolicyRuleInvalidException } from '@modules/policy/exceptions/policy.rule-invalid.exception';
import { EnumPolicyRuleInvalidReason } from '@modules/policy/enums/policy.rule-invalid-reason.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import type {
    IPolicyAbility,
    IPolicyAbilityRule,
    IPolicyAbilitySubject,
    IPolicyConditions,
    IPolicyPlaceholderContext,
    IPolicyRequestContext,
} from '@modules/policy/interfaces/policy.interface';
import {
    isPlainJsonObject,
    resolvePlaceholders,
} from '@modules/policy/utils/policy.condition.util';
import type { PolicyCreateRequestDto } from '@modules/policy/dtos/request/policy.create.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { PolicyRepository } from '@modules/policy/repositories/policy.repository';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { Injectable } from '@nestjs/common';
import { ForbiddenError, subject } from '@casl/ability';
import {
    EnumActivityLogAction,
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type {
    Policy,
    Project,
    Workspace,
} from '@generated/prisma-client/client';
import type { IUser } from '@modules/user/interfaces/user.interface';

@Injectable()
export class PolicyDomain {
    constructor(
        private readonly policyAbilityFactory: PolicyAbilityFactory,
        private readonly policyRepository: PolicyRepository,
        private readonly roleDomain: RoleDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly requestStoreService: RequestStoreService
    ) {
        ForbiddenError.setDefaultMessage(() => '');
    }

    private toCaslSubject(
        name: EnumPolicySubject,
        record?: object
    ): IPolicyAbilitySubject {
        const abilitySubject = abilitySubjectOf(name);
        if (record === undefined) {
            return abilitySubject;
        }

        return subject(abilitySubject, record);
    }

    private async validateRoleExists(roleId: string): Promise<IRole> {
        const role = await this.roleDomain.getById(roleId);
        if (!role) {
            throw new RoleNotFoundException();
        }

        return role;
    }

    private async validateRoleWritable(roleId: string): Promise<IRole> {
        const role = await this.validateRoleExists(roleId);
        if (
            role.scope === EnumRoleScope.platform &&
            role.key === EnumRolePlatformKey.superAdmin
        ) {
            throw new PolicyImmutableException();
        }

        return role;
    }

    private validateRule(rule: {
        subject: EnumPolicySubject;
        action: EnumPolicyAction[];
        conditions: IPolicyConditions | null;
        inverted: boolean;
    }): void {
        if (rule.subject === EnumPolicySubject.all) {
            throw new PolicyRuleInvalidException(
                EnumPolicyRuleInvalidReason.roleScopeInvalid
            );
        }

        // TODO: Validate condition keys and operators when policy authors are no longer trusted.
    }

    private toAbilityRule(
        policy: Policy,
        placeholders: IPolicyPlaceholderContext
    ): IPolicyAbilityRule | null {
        const { conditions } = policy;
        const resolved =
            conditions === null || !isPlainJsonObject(conditions)
                ? null
                : resolvePlaceholders(conditions, placeholders);

        if (conditions !== null && resolved === null && !policy.inverted) {
            return null;
        }

        return {
            subject: policy.subject,
            action: policy.action,
            conditions: resolved,
            inverted: policy.inverted,
            reason: policy.reason,
        };
    }

    /**
     * Builds the ability the current request is judged by and stores it. Platform rules come
     * first, workspace rules second and project rules third. Inverted rules are authoritative
     * when their conditions match. A rule whose placeholder has no value in the context is
     * dropped when it allows and kept as an unconditional deny when inverted.
     */
    buildForRequest(context: IPolicyRequestContext): IPolicyAbility {
        const policies = [
            ...(context.platform ?? []),
            ...(context.workspace ?? []),
            ...(context.project ?? []),
        ];

        const rules: IPolicyAbilityRule[] = [];
        for (const policy of policies) {
            const rule = this.toAbilityRule(policy, context.placeholders);
            if (rule !== null) {
                rules.push(rule);
            }
        }

        const ability = this.policyAbilityFactory.build(rules);
        this.requestStoreService.set(PolicyAbilityStoreKey, ability);

        return ability;
    }

    /**
     * The ability of the current request: the stored one, or one built from the guards' store
     * entries the first time it is asked for.
     */
    getCurrentAbility(): IPolicyAbility {
        const stored = this.requestStoreService.get<IPolicyAbility>(
            PolicyAbilityStoreKey
        );
        if (stored !== null) {
            return stored;
        }

        const user = this.requestStoreService.get<IUser>(UserStoreKey);
        const workspace =
            this.requestStoreService.get<Workspace>(WorkspaceStoreKey);
        const workspaceMember = this.requestStoreService.get<
            NonNullable<IPolicyPlaceholderContext['workspaceMember']>
        >(WorkspaceMemberStoreKey);
        const project = this.requestStoreService.get<Project>(ProjectStoreKey);
        const projectMember = this.requestStoreService.get<
            NonNullable<IPolicyPlaceholderContext['projectMember']>
        >(ProjectMemberStoreKey);
        const platform = this.requestStoreService.get<Policy[]>(PolicyStoreKey);
        const workspacePolicies = this.requestStoreService.get<Policy[]>(
            WorkspaceMemberPolicyStoreKey
        );
        const projectPolicies = this.requestStoreService.get<Policy[]>(
            ProjectMemberPolicyStoreKey
        );

        return this.buildForRequest({
            platform,
            workspace: workspacePolicies,
            project: projectPolicies,
            placeholders: {
                user,
                workspace,
                workspaceMember,
                project,
                projectMember,
            },
        });
    }

    /**
     * Whether the current ability allows `action` on the subject, or on the given record.
     */
    can(
        action: EnumPolicyAction,
        subjectName: EnumPolicySubject,
        record?: object
    ): boolean {
        const ability = this.getCurrentAbility();

        return ability.can(action, this.toCaslSubject(subjectName, record));
    }

    /**
     * Throws `PolicyForbiddenException` when the current ability denies `action` on the
     * subject, carrying the matched rule's `reason` when one is present.
     */
    assertCan(
        action: EnumPolicyAction,
        subjectName: EnumPolicySubject,
        record?: object
    ): void {
        const ability = this.getCurrentAbility();

        try {
            ForbiddenError.from(ability).throwUnlessCan(
                action,
                this.toCaslSubject(subjectName, record)
            );
        } catch (error) {
            if (!(error instanceof ForbiddenError)) {
                throw error;
            }

            const reason = error.message || undefined;
            throw new PolicyForbiddenException(reason);
        }
    }

    async findManyByRole(roleId: string): Promise<Policy[]> {
        await this.validateRoleExists(roleId);

        return this.policyRepository.findManyByRoleId(roleId);
    }

    async createByAdmin(
        roleId: string,
        dto: PolicyCreateRequestDto
    ): Promise<Policy> {
        await this.validateRoleWritable(roleId);
        this.validateRule({
            subject: dto.subject,
            action: dto.action,
            conditions: dto.conditions ?? null,
            inverted: dto.inverted ?? false,
        });

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.adminPolicyCreate,
            }),
        ];

        const created = await this.policyRepository.create(roleId, dto);

        this.activityLogDomain.stagePrepared(events);

        return created;
    }

    async updateByAdmin(
        roleId: string,
        id: string,
        dto: PolicyUpdateRequestDto
    ): Promise<Policy> {
        await this.validateRoleWritable(roleId);

        const stored = await this.policyRepository.findOneByRoleIdAndId(
            roleId,
            id
        );
        if (!stored) {
            throw new PolicyNotFoundException();
        }

        this.validateRule({
            subject: stored.subject,
            action: dto.action,
            conditions: dto.conditions ?? null,
            inverted: dto.inverted ?? false,
        });

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.adminPolicyUpdate,
            }),
        ];

        const updated = await this.policyRepository.update(id, dto);

        this.activityLogDomain.stagePrepared(events);

        return updated;
    }

    async deleteByAdmin(roleId: string, id: string): Promise<Policy> {
        await this.validateRoleWritable(roleId);

        const policyExists = await this.policyRepository.existsByRoleIdAndId(
            roleId,
            id
        );
        if (!policyExists) {
            throw new PolicyNotFoundException();
        }

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.adminPolicyDelete,
            }),
        ];
        const deleted = await this.policyRepository.delete(id);

        this.activityLogDomain.stagePrepared(events);

        return deleted;
    }
}
