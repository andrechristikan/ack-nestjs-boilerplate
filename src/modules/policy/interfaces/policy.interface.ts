import type { Ability, ForcedSubject } from '@casl/ability';
import type { PrismaQueryOf, Subjects } from '@casl/prisma';
import type {
    EnumPolicyAction,
    EnumPolicySubject,
    Policy,
    Prisma,
    Project,
    Workspace,
} from '@generated/prisma-client/client';
import type { IProjectMemberWithRolePolicies } from '@modules/project/interfaces/project.interface';
import type { IUser } from '@modules/user/interfaces/user.interface';
import type { IWorkspaceMemberWithRolePolicies } from '@modules/workspace/interfaces/workspace.interface';
import type { PolicyConditionUnresolved } from '@modules/policy/utils/policy.condition.util';

export type IPolicyConditions = Prisma.JsonObject;

/** The condition pair tying a scoped-role rule to the active workspace or project. */
export interface IPolicyScopePair {
    key: 'id' | 'workspaceId' | 'projectId';
    placeholder: '${workspace.id}' | '${project.id}';
}

export interface IPolicySubjectDefinition {
    /** Prisma model the subject resolves to; null for the `all` wildcard and the `analytic` virtual. */
    model: Prisma.ModelName | null;
    actions: readonly EnumPolicyAction[];
    scope: IPolicyScopePair | null;
}

export interface IPolicyRequired {
    subject: EnumPolicySubject;
    action: EnumPolicyAction[];
}

type IPolicyRoleHolder<T extends { roleId: string; role: { key: string } }> =
    Pick<T, 'roleId'> & { role: Pick<T['role'], 'key'> };

export interface IPolicyPlaceholderContext {
    user: (Pick<IUser, 'id'> & IPolicyRoleHolder<IUser>) | null;
    workspace: Pick<Workspace, 'id'> | null;
    workspaceMember:
        | (Pick<IWorkspaceMemberWithRolePolicies, 'id'> &
              IPolicyRoleHolder<IWorkspaceMemberWithRolePolicies>)
        | null;
    project: Pick<Project, 'id'> | null;
    projectMember:
        | (Pick<IProjectMemberWithRolePolicies, 'id'> &
              IPolicyRoleHolder<IProjectMemberWithRolePolicies>)
        | null;
    language: string | null;
}

export type IPolicyAbilityModels = {
    [K in Prisma.ModelName]: Prisma.TypeMap['model'][K]['payload']['scalars'];
};

export type IPolicyAbilitySubject =
    | 'all'
    | 'analytic'
    | Subjects<IPolicyAbilityModels>
    | ForcedSubject<IPolicyRuleSubject>;

export type IPolicyAbility = Ability<
    [EnumPolicyAction, IPolicyAbilitySubject],
    PrismaQueryOf<Prisma.TypeMap>
>;

export type IPolicySubjectInput =
    | EnumPolicySubject
    | {
          subject: EnumPolicySubject;
          record: IPolicyAbilityModels[Prisma.ModelName];
      };

/** The subject a built ability rule targets: a Prisma model, or the `all` and `analytic` virtual subjects. */
export type IPolicyRuleSubject = Prisma.ModelName | 'all' | 'analytic';

export interface IPolicyAbilityRule {
    subject: IPolicyRuleSubject;
    action: EnumPolicyAction[];
    conditions: IPolicyConditions | null;
    inverted: boolean;
    reason: string | null;
}

export interface IPolicyRequestContext {
    platform: Policy[] | null;
    workspace: Policy[] | null;
    project: Policy[] | null;
    placeholders: IPolicyPlaceholderContext;
}

/** A resolved condition node, or the sentinel when a placeholder has no value in the request context. */
export type IPolicyResolved =
    Prisma.JsonValue | typeof PolicyConditionUnresolved;
