import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    IRole,
    IRoleUpdate,
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';
import type { EnumRoleScope, Prisma } from '@generated/prisma-client/client';

export interface IRoleRepository {
    findWithPaginationOffsetByAdmin(
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<Prisma.RoleWhereInput>,
        scope?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>>;
    findWithPaginationCursorBySystem(
        {
            where,
            ...params
        }: IPaginationQueryCursorParams<Prisma.RoleWhereInput>,
        scope?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>>;
    findWithPaginationOffsetByShared(
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<Prisma.RoleWhereInput>,
        scope?: Record<string, IPaginationEqual>
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>>;
    findOneWithPoliciesById(id: string): Promise<IRoleWithPolicies | null>;
    findOneById(id: string): Promise<IRole | null>;
    findManyByIds(ids: string[]): Promise<IRole[]>;
    findOneByIdInTx(
        tx: IDatabaseTransactionClient,
        id: string
    ): Promise<IRole | null>;
    findOneByScopeAndKey(
        scope: EnumRoleScope,
        key: string
    ): Promise<IRole | null>;
    findOneByScopeAndKeyInTx(
        tx: IDatabaseTransactionClient,
        scope: EnumRoleScope,
        key: string
    ): Promise<IRole | null>;
    update(id: string, data: IRoleUpdate): Promise<IRoleWithPolicies>;
}
