import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { EnumMessageLanguage } from '@common/message/enums/message.enum';
import type {
    ITermPolicy,
    ITermPolicyAcceptanceRow,
    ITermPolicyContent,
    ITermPolicyRef,
    ITermPolicyUserAcceptance,
} from '@modules/term-policy/interfaces/term-policy.interface';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';

export interface ITermPolicyRepository {
    find(
        { where, ...others }: IPaginationQueryOffsetParams,
        type: Record<string, IPaginationIn> | null,
        status: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<ITermPolicy>>;
    findPublished(
        { where, ...others }: IPaginationQueryCursorParams,
        type: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<ITermPolicy>>;
    findUserAccepted(
        userId: string,
        { where, ...others }: IPaginationQueryCursorParams
    ): Promise<IResponsePaginationReturn<ITermPolicyUserAcceptance>>;
    findOneById(termPolicyId: string): Promise<ITermPolicy | null>;
    findOneByIdInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string
    ): Promise<ITermPolicy | null>;
    findLatestPublishedByTypes(
        types: EnumTermPolicyType[]
    ): Promise<ITermPolicyRef[]>;
    findLatestPublishedByTypesInTx(
        tx: IDatabaseTransactionClient,
        types: EnumTermPolicyType[]
    ): Promise<ITermPolicyRef[]>;
    findAcceptedTermPolicyIdsByUser(
        userId: string,
        termPolicyIds: string[]
    ): Promise<string[]>;
    existsByVersionAndType(
        version: number,
        type: EnumTermPolicyType
    ): Promise<boolean>;
    findStatusByVersionAndType(
        version: number,
        type: EnumTermPolicyType
    ): Promise<EnumTermPolicyStatus | null>;
    acceptInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        termPolicyId: string,
        createdBy: string,
        acceptedAt: Date
    ): Promise<ITermPolicyUserAcceptance>;
    acceptManyInTx(
        tx: IDatabaseTransactionClient,
        rows: ITermPolicyAcceptanceRow[]
    ): Promise<void>;
    createInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string,
        type: EnumTermPolicyType,
        version: number,
        contents: ITermPolicyContent[]
    ): Promise<ITermPolicy>;
    deleteDraftInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string
    ): Promise<boolean>;
    updateContentInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string,
        content: ITermPolicyContent
    ): Promise<boolean>;
    addContentInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string,
        newContent: ITermPolicyContent
    ): Promise<boolean>;
    removeContentInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string,
        language: EnumMessageLanguage
    ): Promise<boolean>;
    publishInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string,
        contents: ITermPolicyContent[]
    ): Promise<boolean>;
    archivePublishedByTypeInTx(
        tx: IDatabaseTransactionClient,
        type: EnumTermPolicyType,
        belowVersion: number
    ): Promise<number>;
    existsNewerPublishedInTx(
        tx: IDatabaseTransactionClient,
        type: EnumTermPolicyType,
        version: number
    ): Promise<boolean>;
}
