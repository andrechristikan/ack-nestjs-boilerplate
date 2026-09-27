import { RequestStoreService } from '@common/request/services/request.store.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { RequestLanguageStoreKey } from '@common/request/constants/request.constant';
import {
    PolicyAbilityStoreKey,
    PolicyStoreKey,
    PolicySubjectRegistry,
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
import { PolicyExistException } from '@modules/policy/exceptions/policy.exist.exception';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import { PolicyRuleInvalidException } from '@modules/policy/exceptions/policy.rule-invalid.exception';
import { EnumPolicyRuleInvalidReason } from '@modules/policy/enums/policy.rule-invalid-reason.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import type {
    IPolicyAbility,
    IPolicyAbilityRule,
    IPolicyConditions,
    IPolicyPlaceholderContext,
    IPolicyRequestContext,
    IPolicySubjectDefinition,
    IPolicySubjectInput,
} from '@modules/policy/interfaces/policy.interface';
import {
    hasScopePair,
    isPlainJsonObject,
    resolvePlaceholders,
    scopePairOf,
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
import { subject } from '@casl/ability';
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
        private readonly databaseUtil: DatabaseUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

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

    private validateRule(
        role: IRole,
        rule: {
            subject: EnumPolicySubject;
            action: EnumPolicyAction[];
            conditions: IPolicyConditions | null;
            inverted: boolean;
        }
    ): void {
        const definition: IPolicySubjectDefinition =
            PolicySubjectRegistry[rule.subject];

        if (rule.subject === EnumPolicySubject.all) {
            throw new PolicyRuleInvalidException(
                EnumPolicyRuleInvalidReason.roleScopeInvalid
            );
        }

        const isActionRegistered = rule.action.every(action =>
            definition.actions.includes(action)
        );
        if (!isActionRegistered) {
            throw new PolicyRuleInvalidException(
                EnumPolicyRuleInvalidReason.actionNotAllowed
            );
        }

        const scopePair = scopePairOf(rule.subject, rule.action);
        const isProjectLevel = scopePair?.placeholder === '${project.id}';
        if (role.scope === EnumRoleScope.project && !isProjectLevel) {
            throw new PolicyRuleInvalidException(
                EnumPolicyRuleInvalidReason.roleScopeInvalid
            );
        }

        const requiresScopePair =
            role.scope !== EnumRoleScope.platform &&
            !rule.inverted &&
            scopePair !== null;
        if (requiresScopePair && !hasScopePair(rule.conditions, scopePair)) {
            throw new PolicyRuleInvalidException(
                EnumPolicyRuleInvalidReason.scopeMissing
            );
        }

        // TODO: Validate condition keys and operators when policy authors are no longer trusted.
    }

    private rethrowWriteError(error: unknown): never {
        const isPriorityCollision = this.databaseUtil.isUniqueCollision(
            error,
            'priority'
        );
        if (isPriorityCollision) {
            throw new PolicyExistException();
        }

        throw error;
    }

    private toAbilityRule(
        policy: Policy,
        placeholders: IPolicyPlaceholderContext
    ): IPolicyAbilityRule | null {
        const { conditions } = policy;

        let resolved: IPolicyConditions | null = null;
        let isResolvable = true;
        if (conditions !== null) {
            const isConditionsObject = isPlainJsonObject(conditions);
            if (isConditionsObject) {
                resolved = resolvePlaceholders(conditions, placeholders);
            }
            isResolvable = resolved !== null;
        }

        if (!isResolvable && !policy.inverted) {
            return null;
        }

        return {
            subject: abilitySubjectOf(policy.subject),
            action: policy.action,
            conditions: resolved,
            inverted: policy.inverted,
            reason: policy.reason,
        };
    }

    /**
     * Builds the ability the current request is judged by and stores it. Platform rules come
     * first, workspace rules second and project rules third, each in ascending `priority`; a
     * later rule takes precedence over an earlier one. A rule whose placeholder has no value in
     * the context is dropped when it allows and kept as an unconditional deny when inverted.
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
        const language = this.requestStoreService.get<string>(
            RequestLanguageStoreKey
        );
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
                language,
            },
        });
    }

    /**
     * Whether the current ability allows `action` on the subject, or on the given record. An
     * action the registry does not enforce for the subject is never allowed.
     */
    can(action: EnumPolicyAction, input: IPolicySubjectInput): boolean {
        const subjectName = typeof input === 'string' ? input : input.subject;
        const definition: IPolicySubjectDefinition =
            PolicySubjectRegistry[subjectName];
        if (!definition.actions.includes(action)) {
            return false;
        }

        const abilitySubject = abilitySubjectOf(subjectName);
        const ability = this.getCurrentAbility();
        if (typeof input === 'string') {
            return ability.can(action, abilitySubject);
        }

        return ability.can(action, subject(abilitySubject, input.record));
    }

    assertCan(action: EnumPolicyAction, input: IPolicySubjectInput): void {
        const isAllowed = this.can(action, input);
        if (!isAllowed) {
            throw new PolicyForbiddenException();
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
        const role = await this.validateRoleWritable(roleId);
        this.validateRule(role, {
            subject: dto.subject,
            action: dto.action,
            conditions: dto.conditions ?? null,
            inverted: dto.inverted ?? false,
        });

        const exist = await this.policyRepository.existsByRoleIdAndPriority(
            roleId,
            dto.priority,
            null
        );
        if (exist) {
            throw new PolicyExistException();
        }

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.adminPolicyCreate,
            }),
        ];

        let created: Policy;
        try {
            created = await this.policyRepository.create(roleId, dto);
        } catch (error: unknown) {
            this.rethrowWriteError(error);
        }

        this.activityLogDomain.stagePrepared(events);

        return created;
    }

    async updateByAdmin(
        roleId: string,
        id: string,
        dto: PolicyUpdateRequestDto
    ): Promise<Policy> {
        const role = await this.validateRoleWritable(roleId);

        const stored = await this.policyRepository.findOneByRoleIdAndId(
            roleId,
            id
        );
        if (!stored) {
            throw new PolicyNotFoundException();
        }

        this.validateRule(role, {
            subject: stored.subject,
            action: dto.action,
            conditions: dto.conditions ?? null,
            inverted: dto.inverted ?? false,
        });

        const exist = await this.policyRepository.existsByRoleIdAndPriority(
            roleId,
            dto.priority,
            id
        );
        if (exist) {
            throw new PolicyExistException();
        }

        const events = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.adminPolicyUpdate,
            }),
        ];

        let updated: Policy;
        try {
            updated = await this.policyRepository.update(id, dto);
        } catch (error: unknown) {
            this.rethrowWriteError(error);
        }

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
