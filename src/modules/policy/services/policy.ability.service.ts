import { ForbiddenError } from '@casl/ability';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { accessibleBy } from '@casl/prisma/runtime';
import { Injectable } from '@nestjs/common';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { EnumPolicyConditionPlaceholder } from '@modules/policy/enums/policy.enum';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.ability.factory';
import type {
    IEffectivePermission,
    IPolicyAbility,
    IPolicyAbilitySubject,
    IPolicyContext,
    IPolicyMissing,
    IPolicyModelSubject,
    IPolicyRequired,
    IPolicyRoleRevision,
    IPolicyWhereInput,
} from '@modules/policy/interfaces/policy.interface';
import { PolicyService } from '@modules/policy/services/policy.service';
import type { IProjectContext } from '@modules/project/interfaces/project.interface';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';

@Injectable()
export class PolicyAbilityService {
    constructor(
        private readonly policyService: PolicyService,
        private readonly policyAbilityFactory: PolicyAbilityFactory
    ) {}

    private toSubjectName(target: IPolicyAbilitySubject): EnumPolicySubject {
        return typeof target === 'string' ? target : target.__caslSubjectType__;
    }

    async createAbility(
        userContext: IUserContext,
        workspaceContext: IWorkspaceContext | null,
        projectContext: IProjectContext | null
    ): Promise<IPolicyAbility> {
        const { user } = userContext;
        const roles = [
            user.role,
            workspaceContext?.workspaceMember.role ?? null,
            projectContext?.projectMember?.role ?? null,
        ];
        const revisions: IPolicyRoleRevision[] = roles.flatMap(role =>
            role === null
                ? []
                : [{ roleId: role.id, policyRevision: role.policyRevision }]
        );

        const rules =
            await this.policyService.getRulesByRoleRevisions(revisions);

        return this.policyAbilityFactory.build(rules, {
            [EnumPolicyConditionPlaceholder.userId]: user.id,
            [EnumPolicyConditionPlaceholder.workspaceId]:
                workspaceContext?.workspace.id ?? null,
            [EnumPolicyConditionPlaceholder.projectId]:
                projectContext?.project.id ?? null,
        });
    }

    /** Throws forbidden for an empty requirement list and for any required action the ability denies, grouped by subject with the first inverted rule's reason. */
    validatePolicyGuard(
        policyContext: IPolicyContext,
        required: IPolicyRequired[]
    ): void {
        if (required.length === 0) {
            throw new PolicyForbiddenException();
        }

        const { ability } = policyContext;
        const missing: IPolicyMissing[] = [];
        let reason: string | null = null;

        for (const requirement of required) {
            const denied = requirement.action.filter(
                action => !ability.can(action, requirement.subject)
            );
            if (denied.length === 0) {
                continue;
            }

            missing.push({ subject: requirement.subject, actions: denied });
            if (reason === null) {
                const matched = ability.relevantRuleFor(
                    denied[0]!,
                    requirement.subject
                );
                if (matched?.inverted === true) {
                    reason = matched.reason ?? null;
                }
            }
        }

        if (missing.length > 0) {
            throw new PolicyForbiddenException({
                missing,
                ...(reason !== null && { reason }),
            });
        }
    }

    /**
     * The Prisma where-input the ability grants for a model subject. A caller AND-composes it into
     * a statement, so a record outside it matches no row. Throws forbidden when the ability holds
     * no rule for the pair at all.
     */
    scope<TSubject extends IPolicyModelSubject>(
        policyContext: IPolicyContext,
        action: EnumPolicyAction,
        subject: TSubject
    ): IPolicyWhereInput<TSubject> {
        const ability = policyContext.ability;
        if (ability.rulesFor(action, subject).length === 0) {
            throw new PolicyForbiddenException({
                missing: [{ subject, actions: [action] }],
            });
        }

        return accessibleBy(ability, action).ofType(subject);
    }

    /** Throws forbidden when the ability denies `action` on the subject or record, with the matched inverted rule's reason. */
    authorize(
        policyContext: IPolicyContext,
        action: EnumPolicyAction,
        target: IPolicyAbilitySubject
    ): void {
        const ability = policyContext.ability;
        try {
            ForbiddenError.from(ability).throwUnlessCan(action, target);
        } catch (error: unknown) {
            if (error instanceof ForbiddenError) {
                const matched = ability.relevantRuleFor(action, target);
                const subjectName = this.toSubjectName(target);
                const reason =
                    matched?.inverted === true
                        ? (matched.reason ?? null)
                        : null;
                throw new PolicyForbiddenException({
                    missing: [{ subject: subjectName, actions: [action] }],
                    ...(reason !== null && { reason }),
                });
            }

            throw new AppUnknownException(error);
        }
    }

    /** The concrete actions the ability grants on each target; a target granting nothing is omitted. */
    getEffectivePermissions(
        policyContext: IPolicyContext,
        targets: IPolicyAbilitySubject[]
    ): IEffectivePermission[] {
        const ability = policyContext.ability;

        const permissions: IEffectivePermission[] = [];
        for (const target of targets) {
            const actions = Object.values(EnumPolicyAction).filter(action =>
                ability.can(action, target)
            );
            if (actions.length > 0) {
                const subject = this.toSubjectName(target);
                permissions.push({ subject, actions });
            }
        }

        return permissions;
    }
}
