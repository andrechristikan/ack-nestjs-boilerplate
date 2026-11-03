import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import type { TermPolicyRemoveContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';
import type {
    ITermPolicyAcceptanceRow,
    ITermPolicyContent,
    ITermPolicyRef,
    ITermPolicyUserAcceptance,
} from '@modules/term-policy/interfaces/term-policy.interface';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    Prisma,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';

export interface ITermPolicyRepository {
    find(
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.TermPolicyWhereInput>,
        type: Record<string, IPaginationIn> | null,
        status: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<TermPolicy>>;
    findPublished(
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.TermPolicyWhereInput>,
        type: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<TermPolicy>>;
    findUserAccepted(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.TermPolicyUserAcceptanceWhereInput>
    ): Promise<IResponsePaginationReturn<ITermPolicyUserAcceptance>>;
    findOneById(termPolicyId: string): Promise<TermPolicy | null>;
    findOneByIdInTx(
        tx: IDatabaseTransactionClient,
        termPolicyId: string
    ): Promise<TermPolicy | null>;
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
    create(
        termPolicyId: string,
        { type, version }: TermPolicyCreateRequestDto,
        contents: ITermPolicyContent[]
    ): Promise<TermPolicy>;
    deleteDraft(termPolicyId: string): Promise<boolean>;
    updateContent(
        termPolicyId: string,
        contents: ITermPolicyContent[],
        content: ITermPolicyContent
    ): Promise<boolean>;
    addContent(
        termPolicyId: string,
        newContent: ITermPolicyContent
    ): Promise<boolean>;
    removeContent(
        termPolicyId: string,
        contents: ITermPolicyContent[],
        { language }: TermPolicyRemoveContentRequestDto
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
