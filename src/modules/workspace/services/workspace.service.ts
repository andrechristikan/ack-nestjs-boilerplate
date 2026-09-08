import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import {
    IPaginationEqual,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { Prisma, Workspace } from '@generated/prisma-client';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { WorkspaceCapReachedException } from '@modules/workspace/exceptions/workspace.cap-reached.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceSlugAlreadyExistsException } from '@modules/workspace/exceptions/workspace.slug-already-exists.exception';
import { WorkspaceSlugInvalidException } from '@modules/workspace/exceptions/workspace.slug-invalid.exception';
import {
    IWorkspaceCreate,
    IWorkspaceUpdate,
} from '@modules/workspace/interfaces/workspace.interface';
import { IWorkspaceService } from '@modules/workspace/interfaces/workspace.service.interface';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceService implements IWorkspaceService {
    private readonly maxWorkspacesPerUser: number;
    private readonly slugRegex: RegExp;
    private readonly slugPrefix: string;
    private readonly slugMaxLength: number;
    private readonly slugMaxAttempts: number;

    constructor(
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly requestStoreService: RequestStoreService,
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService,
        private readonly featureFlagService: FeatureFlagService
    ) {
        this.maxWorkspacesPerUser = this.configService.get<number>(
            'workspace.maxWorkspacesPerUser'
        )!;
        this.slugRegex = this.configService.get<RegExp>('workspace.slugRegex')!;
        this.slugPrefix = this.configService.get<string>(
            'workspace.slugPrefix'
        )!;
        this.slugMaxLength = this.configService.get<number>(
            'workspace.slugMaxLength'
        )!;
        this.slugMaxAttempts = this.configService.get<number>(
            'workspace.slugMaxAttempts'
        )!;
    }

    private drawSlugCandidates(): string[] {
        return Array.from({ length: this.slugMaxAttempts }, () =>
            this.helperStringService.generateSlug(
                this.slugPrefix,
                this.slugMaxLength
            )
        );
    }

    private assertSlugAllowed(slug: string): void {
        if (slug.length > this.slugMaxLength || !this.slugRegex.test(slug)) {
            throw new WorkspaceSlugInvalidException();
        }
    }

    private async assertJoinRequestAllowed(): Promise<void> {
        await this.featureFlagService.validateFeatureFlagMetadata(
            'workspace',
            'joinRequestAllowed'
        );
    }

    async validateWorkspaceGuard(
        workspaceId: string | null
    ): Promise<Workspace> {
        if (!workspaceId) {
            throw new WorkspaceNotFoundException();
        }

        const workspace =
            await this.workspaceRepository.findActiveById(workspaceId);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        return workspace;
    }

    async getListForMember(
        userId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceWhereInput>
    ): Promise<IResponsePagingReturn<Workspace>> {
        return this.workspaceRepository.findWithPaginationCursorByMember(
            userId,
            pagination
        );
    }

    async createWorkspace(
        userId: string,
        create: IWorkspaceCreate
    ): Promise<Workspace> {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const ownedCount =
            await this.workspaceMemberRepository.countOwnedActiveByUser(userId);
        if (ownedCount >= this.maxWorkspacesPerUser) {
            throw new WorkspaceCapReachedException();
        }

        return this.workspaceRepository.createWithOwner(
            userId,
            create,
            this.drawSlugCandidates(),
            requestLog
        );
    }

    getCurrentWorkspace(workspace: Workspace): Workspace {
        return workspace;
    }

    async updateWorkspace(
        workspaceId: string,
        actorId: string,
        update: IWorkspaceUpdate
    ): Promise<Workspace> {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        return this.workspaceRepository.updateDetails(
            workspaceId,
            actorId,
            update,
            requestLog
        );
    }

    async updateWorkspaceIsPublic(
        workspaceId: string,
        actorId: string,
        isPublic: boolean
    ): Promise<Workspace> {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        return this.workspaceRepository.updateIsPublic(
            workspaceId,
            actorId,
            isPublic,
            requestLog
        );
    }

    async updateWorkspaceSlug(
        workspaceId: string,
        actorId: string,
        slug: string
    ): Promise<Workspace> {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        this.assertSlugAllowed(slug);

        const slugTaken = await this.workspaceRepository.existsBySlug(
            slug,
            workspaceId
        );
        if (slugTaken) {
            throw new WorkspaceSlugAlreadyExistsException();
        }

        return this.workspaceRepository.updateSlug(
            workspaceId,
            actorId,
            slug,
            requestLog
        );
    }

    async switchWorkspace(userId: string, workspaceId: string): Promise<void> {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        await this.validateWorkspaceGuard(workspaceId);
        await this.workspaceMemberService.validateWorkspaceMemberGuard(
            workspaceId,
            userId
        );

        await this.workspaceRepository.switchForUser(
            userId,
            workspaceId,
            requestLog
        );
    }

    async softDeleteWorkspace(
        workspaceId: string,
        actorId: string
    ): Promise<void> {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        await this.workspaceRepository.softDelete(
            workspaceId,
            actorId,
            requestLog
        );
    }

    async getListForAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceWhereInput>,
        isPublic?: Record<string, IPaginationEqual>
    ): Promise<IResponsePagingReturn<Workspace>> {
        return this.workspaceRepository.findWithPaginationOffsetForAdmin(
            pagination,
            isPublic
        );
    }

    async getByIdForAdmin(workspaceId: string): Promise<Workspace> {
        const workspace =
            await this.workspaceRepository.findByIdForAdmin(workspaceId);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        return workspace;
    }

    /** Resolves a public workspace by slug. A workspace that exists but is not public reports the same `notFound` as one that does not exist, so a slug cannot be probed. */
    async previewWorkspace(slug: string): Promise<Workspace> {
        await this.assertJoinRequestAllowed();

        const workspace =
            await this.workspaceRepository.findActivePublicBySlug(slug);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        return workspace;
    }
}
