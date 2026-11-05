import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumWorkspaceMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { WorkspaceCapReachedException } from '@modules/workspace/exceptions/workspace.cap-reached.exception';
import { WorkspaceLastOwnerException } from '@modules/workspace/exceptions/workspace.last-owner.exception';
import { WorkspaceMemberForbiddenException } from '@modules/workspace/exceptions/workspace.member-forbidden.exception';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberPeerForbiddenException } from '@modules/workspace/exceptions/workspace.member-peer-forbidden.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceRoleForbiddenException } from '@modules/workspace/exceptions/workspace.role-forbidden.exception';
import { WorkspaceSelfTransferException } from '@modules/workspace/exceptions/workspace.self-transfer.exception';
import type { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WorkspaceMemberDomain {
    private readonly maxWorkspacesPerUser: number;

    constructor(
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly configService: ConfigService
    ) {
        this.maxWorkspacesPerUser = this.configService.get<number>(
            'workspace.maxWorkspacesPerUser'
        )!;
    }

    private assertPeerActionAllowed(
        actorMember: WorkspaceMember,
        targetMember: WorkspaceMember
    ): void {
        const isAllowed = this.workspaceUtil.isPeerActionAllowed(
            actorMember.role,
            targetMember.role
        );
        if (!isAllowed) {
            throw new WorkspaceMemberPeerForbiddenException();
        }
    }

    private async transferOwnershipGuarded(
        workspaceId: string,
        fromMemberId: string,
        targetMember: WorkspaceMember
    ): Promise<void> {
        try {
            await this.databaseService.withTransaction(async tx => {
                const ownedCount =
                    await this.workspaceRepository.countByOwnerInTx(
                        tx,
                        targetMember.userId
                    );
                if (ownedCount >= this.maxWorkspacesPerUser) {
                    throw new WorkspaceCapReachedException();
                }

                const promoted =
                    await this.workspaceMemberRepository.promoteToOwnerInTx(
                        tx,
                        workspaceId,
                        fromMemberId,
                        targetMember.id
                    );
                if (!promoted) {
                    throw new WorkspaceMemberPeerForbiddenException();
                }

                const demoted =
                    await this.workspaceMemberRepository.demoteOwnerInTx(
                        tx,
                        workspaceId,
                        fromMemberId
                    );
                if (!demoted) {
                    throw new WorkspaceMemberPeerForbiddenException();
                }
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new WorkspaceMemberPeerForbiddenException();
            }

            throw new AppUnknownException(err);
        }
    }

    async validateWorkspaceMemberGuard(
        workspaceId: string,
        userId: string
    ): Promise<WorkspaceMember> {
        const member =
            await this.workspaceMemberRepository.findOneByWorkspaceAndUser(
                workspaceId,
                userId
            );
        if (!member) {
            throw new WorkspaceMemberForbiddenException();
        }

        return member;
    }

    /** Enforces `allowedRoles` against the caller's membership. An `owner` satisfies every role check structurally and is therefore never listed in a route's `allowedRoles`. */
    validateWorkspaceRoleGuard(
        member: WorkspaceMember,
        allowedRoles: EnumWorkspaceMemberRole[]
    ): WorkspaceMember {
        const hasRole = this.workspaceUtil.hasRole(member, allowedRoles);
        if (!hasRole) {
            throw new WorkspaceRoleForbiddenException();
        }

        return member;
    }

    async getOneByWorkspaceAndUser(
        workspaceId: string,
        userId: string
    ): Promise<WorkspaceMember | null> {
        return this.workspaceMemberRepository.findOneByWorkspaceAndUser(
            workspaceId,
            userId
        );
    }

    async resolveLastWorkspaceId(
        userId: string,
        lastWorkspaceId: string | null
    ): Promise<string | null> {
        if (lastWorkspaceId === null) {
            return null;
        }

        const [workspace, member] = await Promise.all([
            this.workspaceRepository.findActiveById(lastWorkspaceId),
            this.workspaceMemberRepository.findOneByWorkspaceAndUser(
                lastWorkspaceId,
                userId
            ),
        ]);
        if (!workspace || !member) {
            return null;
        }

        return lastWorkspaceId;
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string,
        role: EnumWorkspaceMemberRole,
        actorId: string
    ): Promise<WorkspaceMember> {
        return this.workspaceMemberRepository.createInTx(
            tx,
            workspaceId,
            userId,
            role,
            actorId
        );
    }

    async getReviewerUserIds(workspaceId: string): Promise<string[]> {
        const reviewers =
            await this.workspaceMemberRepository.findReviewersByWorkspace(
                workspaceId
            );

        return reviewers.map(reviewer => reviewer.userId);
    }

    async transferOwnership(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetUserId: string
    ): Promise<void> {
        if (targetUserId === actorMember.userId) {
            throw new WorkspaceSelfTransferException();
        }

        const targetMember =
            await this.workspaceMemberRepository.findOneByWorkspaceAndUser(
                workspaceId,
                targetUserId
            );
        if (!targetMember) {
            throw new WorkspaceMemberNotFoundException();
        }

        await this.transferOwnershipGuarded(
            workspaceId,
            actorMember.id,
            targetMember
        );
    }

    async removeByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<number> {
        return this.workspaceMemberRepository.removeByUserInTx(tx, userId);
    }

    async leaveWorkspaceInTx(
        tx: IDatabaseTransactionClient,
        member: WorkspaceMember
    ): Promise<void> {
        if (member.role === EnumWorkspaceMemberRole.owner) {
            throw new WorkspaceLastOwnerException();
        }

        const removed = await this.workspaceMemberRepository.removeMemberInTx(
            tx,
            member.id,
            member.role
        );
        if (!removed) {
            throw new WorkspaceMemberNotFoundException();
        }
    }

    async getMembersList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceMemberWhereInput>,
        role?: Record<string, IPaginationIn>
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        return this.workspaceMemberRepository.findWithPaginationCursor(
            workspaceId,
            pagination,
            role ?? null
        );
    }

    async updateMemberRole(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMemberId: string,
        newRole: EnumWorkspaceMemberRole
    ): Promise<WorkspaceMember> {
        const targetMember =
            await this.workspaceMemberRepository.findByIdAndWorkspace(
                targetMemberId,
                workspaceId
            );
        if (!targetMember) {
            throw new WorkspaceMemberNotFoundException();
        }

        if (targetMember.userId === actorMember.userId) {
            throw new WorkspaceMemberPeerForbiddenException();
        }

        this.assertPeerActionAllowed(actorMember, targetMember);

        const updated = await this.workspaceMemberRepository.updateRole(
            targetMember.id,
            targetMember.role,
            newRole
        );
        if (!updated) {
            throw new WorkspaceMemberPeerForbiddenException();
        }

        return targetMember;
    }

    async removeMemberInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMemberId: string
    ): Promise<WorkspaceMember> {
        const targetMember =
            await this.workspaceMemberRepository.findByIdAndWorkspace(
                targetMemberId,
                workspaceId
            );
        if (!targetMember) {
            throw new WorkspaceMemberNotFoundException();
        }

        if (targetMember.userId === actorMember.userId) {
            throw new WorkspaceMemberPeerForbiddenException();
        }

        this.assertPeerActionAllowed(actorMember, targetMember);

        const removed = await this.workspaceMemberRepository.removeMemberInTx(
            tx,
            targetMember.id,
            targetMember.role
        );
        if (!removed) {
            throw new WorkspaceMemberPeerForbiddenException();
        }

        return targetMember;
    }

    async getMembersListByAdmin(
        workspaceId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>
    ): Promise<IResponsePaginationReturn<IWorkspaceMember>> {
        const [workspace, paginated] = await Promise.all([
            this.workspaceRepository.findByIdByAdmin(workspaceId),
            this.workspaceMemberRepository.findWithPaginationOffset(
                workspaceId,
                pagination,
                null
            ),
        ]);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        return paginated;
    }
}
