import type { Ability, ForcedSubject, RawRuleOf } from '@casl/ability';
import type { PrismaQuery } from '@casl/prisma';
import type {
    EnumPolicyAction,
    EnumPolicySubject,
    Prisma,
    Project,
    ProjectMember,
    Workspace,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import type { IUser } from '@modules/user/interfaces/user.interface';

export type IPolicyConditions = Prisma.JsonObject;

export type IPolicyPlaceholderValues = Readonly<
    Record<string, string | undefined>
>;

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
    EnumPolicySubject | ForcedSubject<EnumPolicySubject>;

export type IPolicyAbility = Ability<
    [EnumPolicyAction, IPolicyAbilitySubject],
    PrismaQuery
>;

export type IPolicyAbilityRule = RawRuleOf<IPolicyAbility>;
