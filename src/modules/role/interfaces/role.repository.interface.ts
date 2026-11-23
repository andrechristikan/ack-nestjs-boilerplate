import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { EnumRoleScope, Prisma } from '@generated/prisma-client/client';
import type {
    IRole,
    IRoleCreate,
    IRoleRef,
    IRoleUpdate,
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';

export interface IRoleRepository {
    findWithPaginationOffsetByAdmin(
        params: IPaginationQueryOffsetParams,
        scope: Record<string, IPaginationIn> | null,
        additionalWhere: Prisma.RoleWhereInput | null
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>>;
    findWithPaginationCursorByShared(
        params: IPaginationQueryCursorParams,
        scope: EnumRoleScope
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>>;
    findWithPaginationCursorBySystem(
        params: IPaginationQueryCursorParams,
        scope: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>>;
    findOneWithPoliciesById(
        id: string,
        additionalWhere: Prisma.RoleWhereInput | null
    ): Promise<IRoleWithPolicies | null>;
    findOneById(
        id: string,
        additionalWhere: Prisma.RoleWhereInput | null
    ): Promise<IRole | null>;
    findOneByIdInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        additionalWhere: Prisma.RoleWhereInput | null
    ): Promise<IRole | null>;
    findOneRefByScopeAndKey(
        scope: EnumRoleScope,
        key: string
    ): Promise<IRoleRef | null>;
    findOneRefByScopeAndKeyInTx(
        tx: IDatabaseTransactionClient,
        scope: EnumRoleScope,
        key: string
    ): Promise<IRoleRef | null>;
    findOneRefById(id: string): Promise<IRoleRef | null>;
    findOneByUserId(
        userId: string,
        additionalWhere: Prisma.UserWhereInput | null
    ): Promise<IRole | null>;
    existsById(
        id: string,
        additionalWhere: Prisma.RoleWhereInput | null
    ): Promise<boolean>;
    createInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        data: IRoleCreate
    ): Promise<IRoleWithPolicies>;
    updateInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        data: IRoleUpdate,
        additionalWhere: Prisma.RoleWhereInput | null
    ): Promise<IRoleWithPolicies | null>;
    deleteUnusedInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        additionalWhere: Prisma.RoleWhereInput | null
    ): Promise<boolean>;
    incrementPolicyRevisionInTx(
        tx: IDatabaseTransactionClient,
        id: string
    ): Promise<boolean>;
}
