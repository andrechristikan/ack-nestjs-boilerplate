import type { ForcedSubject } from '@casl/ability';
import type { PrismaAbility } from '@casl/prisma';
import type {
    EnumPolicyAction,
    EnumPolicySubject,
    Policy,
    Prisma,
    Project,
    ProjectMember,
    Workspace,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import type { IUser } from '@modules/user/interfaces/user.interface';

export type IPolicyConditions = Prisma.JsonObject;

/** The condition pair tying a scoped-role rule to the active workspace or project. */
export interface IPolicyScopePair {
    key: 'id' | 'workspaceId' | 'projectId';
    placeholder: '${workspace.id}' | '${project.id}';
}

export interface IPolicySubjectDefinition {
    /** Prisma model the subject resolves to; null for the `all` wildcard and the `analytic` virtual. */
    model: Prisma.ModelName | null;
    scope: IPolicyScopePair | null;
}

export interface IPolicyRequired {
    subject: EnumPolicySubject;
    action: EnumPolicyAction[];
}

export interface IPolicyPlaceholderContext {
    user: Pick<IUser, 'id'> | null;
    workspace: Pick<Workspace, 'id'> | null;
    workspaceMember: Pick<WorkspaceMember, 'id'> | null;
    project: Pick<Project, 'id'> | null;
    projectMember: Pick<ProjectMember, 'id'> | null;
}

export type IPolicyAbilitySubject =
    | Prisma.ModelName
    | 'all'
    | 'analytic'
    | ForcedSubject<Prisma.ModelName | 'all' | 'analytic'>;

export type IPolicyAbility = PrismaAbility<
    [EnumPolicyAction, IPolicyAbilitySubject]
>;

export interface IPolicyAbilityRule {
    subject: EnumPolicySubject;
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
