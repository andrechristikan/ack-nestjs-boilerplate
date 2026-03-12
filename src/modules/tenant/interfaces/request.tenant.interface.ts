import { IRequestApp } from '@common/request/interfaces/request.interface';
import { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import {
    ITenant,
    ITenantMember,
} from '@modules/tenant/interfaces/tenant.interface';

export interface IRequestAppTenant {
    __tenantId?: string;
    __tenant?: ITenant;
    __tenantMember?: ITenantMember;
}

export type IRequestAppWithTenant<T = IAuthJwtAccessTokenPayload> =
    IRequestApp<T> & IRequestAppTenant;
