import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { Prisma } from '@generated/prisma-client/client';
import type { Workspace } from '@generated/prisma-client/client';
import { WorkspaceCapReachedException } from '@modules/workspace/exceptions/workspace.cap-reached.exception';
import { WorkspaceHeaderMissingException } from '@modules/workspace/exceptions/workspace.header-missing.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceSlugAlreadyExistsException } from '@modules/workspace/exceptions/workspace.slug-already-exists.exception';
import { WorkspaceSlugInvalidException } from '@modules/workspace/exceptions/workspace.slug-invalid.exception';
import type {
    IWorkspaceCreate,
    IWorkspaceOwnedUser,
    IWorkspaceUpdate,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceDomain {
    private readonly maxWorkspacesPerUser: number;

    constructor(
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly configService: ConfigService
    ) {
        this.maxWorkspacesPerUser = this.configService.get<number>(
            'workspace.maxWorkspacesPerUser'
        )!;
    }

    async validateWorkspaceGuard(
        workspaceId: string | null
    ): Promise<Workspace> {
        if (!workspaceId) {
            throw new WorkspaceHeaderMissingException();
        }

        const workspace =
            await this.workspaceRepository.findActiveById(workspaceId);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        return workspace;
    }

    async getListCursorByMember(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceWhereInput>
    ): Promise<IResponsePaginationReturn<Workspace>> {
        return this.workspaceRepository.findWithPaginationCursorByMember(
            userId,
            pagination
        );
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        ownerId: string,
        create: IWorkspaceCreate,
        slug: string,
        workspaceId: string
    ): Promise<Workspace> {
        const workspace = await this.workspaceRepository.createInTx(
            tx,
            ownerId,
            create,
            slug,
            workspaceId
        );
        await this.workspaceMemberRepository.createOwnerInTx(
            tx,
            workspace.id,
            ownerId
        );

        return workspace;
    }

    async createPersonalInTx(
        tx: IDatabaseTransactionClient,
        ownerId: string,
        name: string,
        slug: string,
        workspaceId: string
    ): Promise<Workspace> {
        return this.createInTx(
            tx,
            ownerId,
            { name, description: null, isPublic: null },
            slug,
            workspaceId
        );
    }

    async createOwnedForUsersInTx(
        tx: IDatabaseTransactionClient,
        users: IWorkspaceOwnedUser[]
    ): Promise<void> {
        for (const user of users) {
            await this.createPersonalInTx(
                tx,
                user.userId,
                user.name,
                user.slug,
                user.workspaceId
            );
        }
    }

    async createWorkspace(
        userId: string,
        create: IWorkspaceCreate
    ): Promise<Workspace> {
        const slugCandidates = this.workspaceUtil.drawSlugCandidates();

        for (const slug of slugCandidates) {
            const workspaceId = this.databaseUtil.createId();

            try {
                return await this.databaseService.withTransaction(async tx => {
                    // Sequential by design: gate before the work it guards
                    const ownedCount =
                        await this.workspaceRepository.countByOwnerInTx(
                            tx,
                            userId
                        );
                    if (ownedCount >= this.maxWorkspacesPerUser) {
                        throw new WorkspaceCapReachedException();
                    }

                    return this.createInTx(
                        tx,
                        userId,
                        create,
                        slug,
                        workspaceId
                    );
                });
            } catch (error: unknown) {
                const isSlugCollision = this.databaseUtil.isUniqueCollision(
                    error,
                    'slug'
                );
                if (!isSlugCollision) {
                    if (error instanceof AppBaseException) {
                        throw error;
                    }

                    throw new AppUnknownException(error);
                }
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }

    async updateWorkspace(
        workspaceId: string,
        update: IWorkspaceUpdate
    ): Promise<Workspace> {
        return this.workspaceRepository.updateDetails(workspaceId, update);
    }

    async updateWorkspaceIsPublic(
        workspaceId: string,
        isPublic: boolean
    ): Promise<Workspace> {
        return this.workspaceRepository.updateIsPublic(workspaceId, isPublic);
    }

    async updateWorkspaceSlug(
        workspaceId: string,
        slug: string
    ): Promise<Workspace> {
        const isSlugAllowed = this.workspaceUtil.isSlugAllowed(slug);
        if (!isSlugAllowed) {
            throw new WorkspaceSlugInvalidException();
        }

        try {
            return await this.workspaceRepository.updateSlug(workspaceId, slug);
        } catch (err: unknown) {
            const isSlugCollision = this.databaseUtil.isUniqueCollision(
                err,
                'slug'
            );
            if (isSlugCollision) {
                throw new WorkspaceSlugAlreadyExistsException();
            }

            throw new AppUnknownException(err);
        }
    }

    async softDeleteInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        deletedAt: Date
    ): Promise<void> {
        await this.workspaceRepository.softDeleteInTx(
            tx,
            workspaceId,
            deletedAt
        );
    }

    /** Soft-deletes every live workspace the user is the only owner of and answers their ids. */
    async softDeleteSolelyOwnedByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string,
        deletedAt: Date
    ): Promise<string[]> {
        return this.workspaceRepository.softDeleteSolelyOwnedByUserInTx(
            tx,
            userId,
            deletedAt
        );
    }

    async getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceWhereInput>,
        isPublic?: Record<string, IPaginationEqual>
    ): Promise<IResponsePaginationReturn<Workspace>> {
        return this.workspaceRepository.findWithPaginationOffsetByAdmin(
            pagination,
            isPublic ?? null
        );
    }

    async getByIdByAdmin(workspaceId: string): Promise<Workspace> {
        const workspace =
            await this.workspaceRepository.findByIdByAdmin(workspaceId);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        return workspace;
    }

    /** Resolves a public workspace by slug. A workspace that exists but is not public reports the same `notFound` as one that does not exist, so a slug cannot be probed. */
    async previewWorkspace(slug: string): Promise<Workspace> {
        const workspace =
            await this.workspaceRepository.findActivePublicBySlug(slug);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        return workspace;
    }
}
