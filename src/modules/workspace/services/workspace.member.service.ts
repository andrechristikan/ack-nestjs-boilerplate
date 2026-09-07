import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumWorkspaceMemberRole,
    Prisma,
    WorkspaceMember,
} from '@generated/prisma-client';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { WorkspaceLastOwnerException } from '@modules/workspace/exceptions/workspace.last-owner.exception';
import { WorkspaceMemberForbiddenException } from '@modules/workspace/exceptions/workspace.member-forbidden.exception';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberPeerForbiddenException } from '@modules/workspace/exceptions/workspace.member-peer-forbidden.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceRoleForbiddenException } from '@modules/workspace/exceptions/workspace.role-forbidden.exception';
import { WorkspaceSelfTransferException } from '@modules/workspace/exceptions/workspace.self-transfer.exception';
import { IWorkspaceMember } from '@modules/workspace/interfaces/workspace.interface';
import { IWorkspaceMemberService } from '@modules/workspace/interfaces/workspace.member.service.interface';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkspaceMemberService implements IWorkspaceMemberService {
    constructor(
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly workspaceRepository: WorkspaceRepository,
        private readonly requestStoreService: RequestStoreService
    ) {}

    private assertPeerActionAllowed(
        actorMember: WorkspaceMember,
        targetMember: WorkspaceMember
    ): void {
        if (targetMember.role === EnumWorkspaceMemberRole.owner) {
            throw new WorkspaceMemberPeerForbiddenException();
        }

        if (
            actorMember.role === EnumWorkspaceMemberRole.admin &&
            targetMember.role === EnumWorkspaceMemberRole.admin
        ) {
            throw new WorkspaceMemberPeerForbiddenException();
        }
    }

    async validateWorkspaceMemberGuard(
        workspaceId: string | null,
        userId: string | null
    ): Promise<WorkspaceMember> {
        if (!userId) {
            throw new AuthJwtAccessTokenInvalidException();
        } else if (!workspaceId) {
            throw new WorkspaceNotFoundException();
        }

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
        member: WorkspaceMember | null,
        allowedRoles: EnumWorkspaceMemberRole[]
    ): WorkspaceMember {
        if (!member) {
            throw new WorkspaceRoleForbiddenException();
        }

        if (member.role === EnumWorkspaceMemberRole.owner) {
            return member;
        }

        if (!allowedRoles.includes(member.role)) {
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

    async transferOwnership(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetUserId: string
    ): Promise<void> {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

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

        await this.workspaceMemberRepository.transferOwnership(
            workspaceId,
            actorMember.id,
            targetMember.id,
            actorMember.userId,
            requestLog
        );
    }

    async leaveWorkspace(
        workspaceId: string,
        member: WorkspaceMember
    ): Promise<void> {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        if (member.role === EnumWorkspaceMemberRole.owner) {
            const ownerCount =
                await this.workspaceMemberRepository.countOwners(workspaceId);
            if (ownerCount <= 1) {
                throw new WorkspaceLastOwnerException();
            }
        }

        await this.workspaceMemberRepository.removeMember(
            workspaceId,
            member.userId,
            member.id,
            EnumActivityLogAction.workspaceMemberLeft,
            requestLog
        );
    }

    async getMembersList(
        workspaceId: string,
        pagination: IPaginationQueryCursorParams<Prisma.WorkspaceMemberWhereInput>,
        role?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<IWorkspaceMember>> {
        return this.workspaceMemberRepository.findWithPaginationCursor(
            workspaceId,
            pagination,
            role
        );
    }

    async updateMemberRole(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMemberId: string,
        newRole: EnumWorkspaceMemberRole
    ): Promise<void> {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

        const targetMember =
            await this.workspaceMemberRepository.findByIdAndWorkspace(
                targetMemberId,
                workspaceId
            );
        if (!targetMember) {
            throw new WorkspaceMemberNotFoundException();
        }

        this.assertPeerActionAllowed(actorMember, targetMember);

        await this.workspaceMemberRepository.updateRole(
            workspaceId,
            actorMember.userId,
            targetMember.id,
            newRole,
            requestLog
        );
    }

    async removeMember(
        workspaceId: string,
        actorMember: WorkspaceMember,
        targetMemberId: string
    ): Promise<void> {
        const requestLog =
            this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;

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

        await this.workspaceMemberRepository.removeMember(
            workspaceId,
            actorMember.userId,
            targetMember.id,
            EnumActivityLogAction.workspaceMemberRemoved,
            requestLog
        );
    }

    async getMembersListForAdmin(
        workspaceId: string,
        pagination: IPaginationQueryOffsetParams<Prisma.WorkspaceMemberWhereInput>
    ): Promise<IResponsePagingReturn<IWorkspaceMember>> {
        const [workspace, paginated] = await Promise.all([
            this.workspaceRepository.findByIdForAdmin(workspaceId),
            this.workspaceMemberRepository.findWithPaginationOffset(
                workspaceId,
                pagination
            ),
        ]);
        if (!workspace) {
            throw new WorkspaceNotFoundException();
        }

        return paginated;
    }
}
