import {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { EnumRoleType, Policy, Prisma, Role } from '@generated/prisma-client';
import {
    IRoleCreate,
    IRoleUpdate,
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';
import { IUser } from '@modules/user/interfaces/user.interface';

export interface IRoleService {
    getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.RoleWhereInput>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<IRoleWithPolicyCount>>;
    getListCursorBySystem(
        pagination: IPaginationQueryCursorParams<Prisma.RoleWhereInput>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<IRoleWithPolicyCount>>;
    getOne(id: string): Promise<IRoleWithPolicies>;
    createByAdmin(data: IRoleCreate): Promise<IRoleWithPolicies>;
    updateByAdmin(id: string, data: IRoleUpdate): Promise<IRoleWithPolicies>;
    deleteByAdmin(id: string): Promise<Role>;
    validateRoleGuard(
        user: IUser | null,
        requiredRoles: EnumRoleType[]
    ): Promise<Policy[]>;
}
