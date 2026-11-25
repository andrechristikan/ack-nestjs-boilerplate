import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { EnumMessageLanguage } from '@common/message/enums/message.enum';
import type {
    ITermPolicyAcceptanceRow,
    ITermPolicyContent,
    ITermPolicyRef,
    ITermPolicyRefAcceptance,
    ITermPolicyUserAcceptance,
} from '@modules/term-policy/interfaces/term-policy.interface';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';

export interface ITermPolicyRepository {
    find(
        { where, ...others }: IPaginationQueryOffsetParams,
        type: Record<string, IPaginationIn> | null,
        status: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<TermPolicy>>;
    findPublished(
        { where, ...others }: IPaginationQueryCursorParams,
        type: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<TermPolicy>>;
    findUserAccepted(
        userId: string,
        { where, ...others }: IPaginationQueryCursorParams
    ): Promise<IResponsePaginationReturn<ITermPolicyUserAcceptance>>;
    findOneById(termPolicyId: string): Promise<TermPolicy | null>;
    findLatestPublishedWithAcceptanceByUser(
        types: EnumTermPolicyType[],
        userId: string
    ): Promise<ITermPolicyRefAcceptance[]>;
    findLatestPublishedByTypes(
        types: EnumTermPolicyType[]
    ): Promise<ITermPolicyRef[]>;
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
    ): Promise<void>;
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
    ): Promise<TermPolicy>;
    deleteDraftInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string
    ): Promise<TermPolicy>;
    updateContentInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string,
        contents: ITermPolicyContent[],
        content: ITermPolicyContent,
        expectedUpdatedAt: Date
    ): Promise<TermPolicy>;
    addContentInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string,
        newContent: ITermPolicyContent
    ): Promise<TermPolicy>;
    removeContentInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string,
        contents: ITermPolicyContent[],
        language: EnumMessageLanguage,
        expectedUpdatedAt: Date
    ): Promise<TermPolicy>;
    publishInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string,
        contents: ITermPolicyContent[],
        publishedAt: Date
    ): Promise<TermPolicy>;
    archivePublishedByTypeInTx(
        tx: IDatabaseTransactionClient,
        type: EnumTermPolicyType,
        belowVersion: number
    ): Promise<number>;
    existsNewerPublished(
        type: EnumTermPolicyType,
        version: number
    ): Promise<boolean>;
}
