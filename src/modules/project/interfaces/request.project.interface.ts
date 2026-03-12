import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { IPolicyAbilityRule } from '@modules/policy/interfaces/policy.interface';
import { IProjectMember } from '@modules/project/interfaces/project.interface';
import { IRequestAppTenant } from '@modules/tenant/interfaces/request.tenant.interface';

export interface IRequestAppProject {
    __projectId?: string;
    __projectMember?: IProjectMember;
    __projectAbilities?: IPolicyAbilityRule;
}

export type IRequestAppWithProject<T = IAuthJwtAccessTokenPayload> =
    IRequestApp<T> & IRequestAppProject;

export type IRequestAppWithProjectTenant<T = IAuthJwtAccessTokenPayload> =
    IRequestApp<T> & IRequestAppProject & IRequestAppTenant;
