import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type {
    IPaginationCursorReturn,
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { WorkspaceActiveFilter } from '@modules/workspace/constants/workspace.constant';
import type { WorkspaceCreateRequestDto } from '@modules/workspace/dtos/request/workspace.create.request.dto';
import type { WorkspaceUpdateRequestDto } from '@modules/workspace/dtos/request/workspace.update.request.dto';
import type { IWorkspaceRepository } from '@modules/workspace/interfaces/workspace.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceRepository implements IWorkspaceRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findActiveById(workspaceId: string): Promise<Workspace | null> {
        return this.databaseService.client.workspace.findFirst({
            where: {
                id: workspaceId,
                ...WorkspaceActiveFilter,
            },
        });
    }

    async findActivePublicBySlug(slug: string): Promise<Workspace | null> {
        return this.databaseService.client.workspace.findFirst({
            where: {
                slug,
                isPublic: true,
                ...WorkspaceActiveFilter,
            },
        });
    }

    async findByIdForAdmin(workspaceId: string): Promise<Workspace | null> {
        return this.databaseService.client.workspace.findUnique({
            where: { id: workspaceId },
        });
    }

    /** Counts slug holders across ALL rows including soft-deleted ones, matching the unique index, which has no `deletedAt` component. */
    async existsBySlug(
        slug: string,
        excludeWorkspaceId?: string
    ): Promise<boolean> {
        const count = await this.databaseService.client.workspace.count({
            where: {
                slug,
                ...(excludeWorkspaceId
                    ? { id: { not: excludeWorkspaceId } }
                    : {}),
            },
        });

        return count > 0;
    }

    async findWithPaginationCursorByMember(
        userId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.WorkspaceWhereInput>
    ): Promise<IPaginationCursorReturn<Workspace>> {
        return this.paginationService.cursor<
            Workspace,
            Prisma.WorkspaceWhereInput
        >(this.databaseService.client.workspace, {
            ...others,
            where: {
                AND: [
                    where ?? {},
                    WorkspaceActiveFilter,
                    { members: { some: { userId } } },
                ],
            },
        });
    }

    async findWithPaginationOffsetForAdmin(
        {
            where,
            ...others
        }: IPaginationQueryOffsetParams<Prisma.WorkspaceWhereInput>,
        isPublic?: Record<string, IPaginationEqual>
    ): Promise<IResponsePaginationReturn<Workspace>> {
        return this.paginationService.offset<
            Workspace,
            Prisma.WorkspaceWhereInput
        >(this.databaseService.client.workspace, {
            ...others,
            where: {
                ...where,
                ...isPublic,
            },
        });
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        ownerId: string,
        { name, description, isPublic }: WorkspaceCreateRequestDto,
        slug: string,
        workspaceId: string
    ): Promise<Workspace> {
        return tx.workspace.create({
            data: {
                id: workspaceId,
                name,
                slug,
                description,
                isPublic: isPublic ?? false,
                createdBy: ownerId,
                deletedAt: null,
            },
        });
    }

    async updateDetails(
        workspaceId: string,
        { name, description }: WorkspaceUpdateRequestDto
    ): Promise<Workspace> {
        return this.databaseService.client.workspace.update({
            where: { id: workspaceId },
            data: {
                name,
                description,
            },
        });
    }

    async updateIsPublic(
        workspaceId: string,
        isPublic: boolean
    ): Promise<Workspace> {
        return this.databaseService.client.workspace.update({
            where: { id: workspaceId },
            data: {
                isPublic,
            },
        });
    }

    async updateSlug(workspaceId: string, slug: string): Promise<Workspace> {
        return this.databaseService.client.workspace.update({
            where: { id: workspaceId },
            data: {
                slug,
            },
        });
    }

    async softDeleteInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        deletedAt: Date
    ): Promise<void> {
        await tx.workspace.softDelete({
            where: { id: workspaceId },
            data: {
                deletedAt,
            },
        });
    }
}
