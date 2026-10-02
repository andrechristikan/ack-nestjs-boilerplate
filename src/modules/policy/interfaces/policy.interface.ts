import type { Ability, ForcedSubject, RawRuleOf } from '@casl/ability';
import type { PrismaQuery } from '@casl/prisma';
import type {
    EnumPolicyAction,
    EnumPolicySubject,
    Prisma,
} from '@generated/prisma-client/client';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import type { EnumPolicyConditionPlaceholder } from '@modules/policy/constants/policy.constant';
import type { EnumPolicyAbilityScope } from '@modules/policy/enums/policy.enum';

export type IPolicyConditions = Prisma.JsonObject;

export type PolicyPlaceholderValues = Readonly<
    Partial<Record<EnumPolicyConditionPlaceholder, string | undefined>>
>;

export interface IPolicyRequired<TSubject extends EnumPolicySubject> {
    subject: TSubject;
    action: EnumPolicyAction[];
}

/**
 * One row of the caller's effective permissions: a subject and the concrete actions the resolved
 * ability grants on it.
 * @public
 */
export interface IEffectivePermission {
    subject: EnumPolicySubject;
    actions: EnumPolicyAction[];
}

export type PolicyAbilitySubject =
    EnumPolicySubject | ForcedSubject<EnumPolicySubject>;

export type PolicyAbility = Ability<
    [EnumPolicyAction, PolicyAbilitySubject],
    PrismaQuery
>;

export type PolicyAbilityRule = RawRuleOf<PolicyAbility>;

/** Platform layer input: the user's platform role; resolves `userId`. */
export interface IPolicyAbilityPlatformInput {
    scope: EnumPolicyAbilityScope.platform;
    user: { id: string; roleId: string };
}

/** Workspace layer input: the acting workspace member's role; resolves `workspaceId`. */
export interface IPolicyAbilityWorkspaceInput {
    scope: EnumPolicyAbilityScope.workspace;
    workspace: { id: string; memberRoleId: string };
}

/** Project layer input: the acting project member's role, null when no row exists; resolves `projectId`. */
export interface IPolicyAbilityProjectInput {
    scope: EnumPolicyAbilityScope.project;
    project: { id: string; memberRoleId: string | null };
}

export type IPolicyAbilityBuildInput =
    | IPolicyAbilityPlatformInput
    | IPolicyAbilityWorkspaceInput
    | IPolicyAbilityProjectInput;

/** Loads or validates the record a policy subject addresses, or answers null when the route addresses none and only the subject type is judged. */
export interface IPolicyTargetResolver<TRecord extends object = object> {
    storeKey: string | null;
    resolve(
        request: IRequestApp,
        ability: PolicyAbility,
        action: EnumPolicyAction
    ): Promise<TRecord | null>;
}

/** The target resolvers of one scope, keyed by subject; a subject with no entry is a type-only check. */
export type PolicyTargetResolverRegistry<TSubject extends EnumPolicySubject> =
    Partial<Record<TSubject, IPolicyTargetResolver>>;
