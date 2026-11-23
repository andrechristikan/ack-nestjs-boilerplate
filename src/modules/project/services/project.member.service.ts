import type { Prisma } from '@generated/prisma-client/client';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { Project, WorkspaceMember } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectMemberAlreadyAssignedException } from '@modules/project/exceptions/project.member-already-assigned.exception';
import { ProjectMemberLastAdminException } from '@modules/project/exceptions/project.member-last-admin.exception';
import { ProjectMemberNotFoundException } from '@modules/project/exceptions/project.member-not-found.exception';
import { ProjectMemberPeerForbiddenException } from '@modules/project/exceptions/project.member-peer-forbidden.exception';
import { EnumRoleProjectKey } from '@modules/role/enums/role.enum';
import { RoleService } from '@modules/role/services/role.service';
import type { IProjectMemberWithRole } from '@modules/project/interfaces/project.interface';
import type {
    IProjectMember,
    IProjectMemberActor,
} from '@modules/project/interfaces/project.interface';
import { ProjectMemberRepository } from '@modules/project/repositories/project.member.repository';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { Injectable } from '@nestjs/common';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class ProjectMemberService {
    constructor(
        private readonly projectMemberRepository: ProjectMemberRepository,
        private readonly roleService: RoleService,
        private readonly outboxService: OutboxService,
        private readonly activityLogService: ActivityLogService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    private async assertNotLastAdmin(projectId: string): Promise<void> {
        const admins =
            await this.projectMemberRepository.countByProjectAndRoleKey(
                projectId,
                EnumRoleProjectKey.admin
            );
        if (admins <= 1) {
            throw new ProjectMemberLastAdminException();
        }
    }

    assertPeerAllowed(
        { hasWorkspaceBypass }: IProjectMemberActor,
        ...roleKeysInvolved: string[]
    ): void {
        if (
            !hasWorkspaceBypass &&
            roleKeysInvolved.includes(EnumRoleProjectKey.admin)
        ) {
            throw new ProjectMemberPeerForbiddenException();
        }
    }

    /** The caller's member row in the project, or `null` when it has none; access is decided by the policies. */
    async getMemberOrNull(
        projectId: string,
        userId: string
    ): Promise<IProjectMemberWithRole | null> {
        return this.projectMemberRepository.findOneByProjectAndUser(
            projectId,
            userId
        );
    }

    assertMember(
        member: IProjectMemberWithRole | null
    ): IProjectMemberWithRole {
        if (member === null) {
            throw new ProjectMemberNotFoundException();
        }

        return member;
    }

    async getMembersList(
        project: Project,
        pagination: IPaginationQueryCursorParams,
        additionalWhere: Prisma.ProjectMemberWhereInput | null
    ): Promise<IResponsePaginationReturn<IProjectMember>> {
        return this.projectMemberRepository.findWithPaginationCursor(
            project.id,
            pagination,
            additionalWhere
        );
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        userId: string,
        roleId: string,
        createdBy: string
    ): Promise<IProjectMember> {
        return this.projectMemberRepository.createInTx(
            tx,
            projectId,
            userId,
            roleId,
            createdBy
        );
    }

    async removeByWorkspaceAndUserInTx(
        tx: IDatabaseTransactionClient,
        workspaceId: string,
        userId: string
    ): Promise<number> {
        return this.projectMemberRepository.removeByWorkspaceAndUserInTx(
            tx,
            workspaceId,
            userId
        );
    }

    async removeByUserInTx(
        tx: IDatabaseTransactionClient,
        userId: string
    ): Promise<number> {
        return this.projectMemberRepository.removeByUserInTx(tx, userId);
    }

    /** Creates the member and adds the actor's and the assignee's activity entries in one transaction, dispatched after the commit. */
    async assignMember(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        project: Project,
        actor: IProjectMemberActor,
        targetMember: WorkspaceMember | null,
        roleId: string
    ): Promise<IProjectMember> {
        const role = await this.roleService.getRefByIdForScope(
            roleId,
            EnumRoleScope.project
        );
        this.assertPeerAllowed(actor, role.key);

        if (!targetMember || targetMember.workspaceId !== project.workspaceId) {
            throw new WorkspaceMemberNotFoundException();
        }

        try {
            return await this.outboxService.withTransaction(async tx => {
                const member = await this.projectMemberRepository.createInTx(
                    tx,
                    project.id,
                    targetMember.userId,
                    role.id,
                    actor.userId
                );
                const actorEntry = this.activityLogService.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    {
                        action: EnumActivityLogAction.projectMemberAssigned,
                        userId: actor.userId,
                        createdBy: actor.userId,
                        workspaceId: project.workspaceId,
                        metadata: { targetUserId: targetMember.userId },
                    }
                );
                const entries = [actorEntry];
                if (targetMember.userId !== actor.userId) {
                    const assigneeEntry = this.activityLogService.recordEffect(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        null,
                        {
                            action: EnumActivityLogAction.projectMemberAssignedByAdmin,
                            userId: targetMember.userId,
                            createdBy: actor.userId,
                            workspaceId: project.workspaceId,
                            metadata: { actorUserId: actor.userId },
                        }
                    );
                    entries.push(assigneeEntry);
                }
                await this.outboxService.addManyInTx(tx, entries);

                return member;
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const isAlreadyAssigned = this.databaseUtil.isUniqueCollision(
                err,
                'userId'
            );
            if (isAlreadyAssigned) {
                throw new ProjectMemberAlreadyAssignedException();
            }

            throw new AppUnknownException(err);
        }
    }

    /** Swaps the role guarded by the role read and adds the actor's and the target's activity entries in one transaction, dispatched after the commit. */
    async updateMemberRole(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        project: Project,
        actor: IProjectMemberActor,
        targetMemberId: string,
        newRoleId: string,
        additionalWhere: Prisma.ProjectMemberWhereInput | null
    ): Promise<void> {
        const newRole = await this.roleService.getRefByIdForScope(
            newRoleId,
            EnumRoleScope.project
        );
        const targetMember =
            await this.projectMemberRepository.findByIdAndProject(
                targetMemberId,
                project.id,
                additionalWhere
            );
        if (!targetMember) {
            throw new ProjectMemberNotFoundException();
        }

        this.assertPeerAllowed(actor, targetMember.role.key, newRole.key);
        if (
            targetMember.role.key === EnumRoleProjectKey.admin &&
            newRole.key !== EnumRoleProjectKey.admin
        ) {
            await this.assertNotLastAdmin(project.id);
        }

        try {
            await this.outboxService.withTransaction(async tx => {
                const updated =
                    await this.projectMemberRepository.updateRoleInTx(
                        tx,
                        targetMember.id,
                        targetMember.roleId,
                        newRole.id
                    );
                if (!updated) {
                    throw new ProjectMemberPeerForbiddenException();
                }

                const actorEntry = this.activityLogService.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    {
                        action: EnumActivityLogAction.projectMemberRoleUpdated,
                        userId: actor.userId,
                        createdBy: actor.userId,
                        workspaceId: project.workspaceId,
                        metadata: { targetUserId: targetMember.userId },
                    }
                );
                const entries = [actorEntry];
                if (targetMember.userId !== actor.userId) {
                    const targetEntry = this.activityLogService.recordEffect(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        null,
                        {
                            action: EnumActivityLogAction.projectMemberRoleUpdatedByAdmin,
                            userId: targetMember.userId,
                            createdBy: actor.userId,
                            workspaceId: project.workspaceId,
                            metadata: { actorUserId: actor.userId },
                        }
                    );
                    entries.push(targetEntry);
                }
                await this.outboxService.addManyInTx(tx, entries);
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new ProjectMemberPeerForbiddenException();
            }

            throw new AppUnknownException(err);
        }
    }

    /** Removes the member guarded by the role read and adds the actor's and the target's activity entries in one transaction, dispatched after the commit. */
    async removeMember(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        project: Project,
        actor: IProjectMemberActor,
        targetMemberId: string,
        additionalWhere: Prisma.ProjectMemberWhereInput | null
    ): Promise<void> {
        const targetMember =
            await this.projectMemberRepository.findByIdAndProject(
                targetMemberId,
                project.id,
                additionalWhere
            );
        if (!targetMember) {
            throw new ProjectMemberNotFoundException();
        }

        if (targetMember.userId === actor.userId) {
            throw new ProjectMemberPeerForbiddenException();
        }

        this.assertPeerAllowed(actor, targetMember.role.key);
        if (targetMember.role.key === EnumRoleProjectKey.admin) {
            await this.assertNotLastAdmin(project.id);
        }

        try {
            await this.outboxService.withTransaction(async tx => {
                const removed =
                    await this.projectMemberRepository.removeMemberInTx(
                        tx,
                        targetMember.id,
                        targetMember.roleId
                    );
                if (!removed) {
                    throw new ProjectMemberPeerForbiddenException();
                }

                const actorEntry = this.activityLogService.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    {
                        action: EnumActivityLogAction.projectMemberRemoved,
                        userId: actor.userId,
                        createdBy: actor.userId,
                        workspaceId: project.workspaceId,
                        metadata: { targetUserId: targetMember.userId },
                    }
                );
                const targetEntry = this.activityLogService.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    {
                        action: EnumActivityLogAction.projectMemberRemovedByAdmin,
                        userId: targetMember.userId,
                        createdBy: actor.userId,
                        workspaceId: project.workspaceId,
                        metadata: { actorUserId: actor.userId },
                    }
                );
                await this.outboxService.addManyInTx(tx, [
                    actorEntry,
                    targetEntry,
                ]);
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new ProjectMemberPeerForbiddenException();
            }

            throw new AppUnknownException(err);
        }
    }

    /** Removes the member row and adds the member's activity entry in one transaction, dispatched after the commit. */
    async leaveProject(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        project: Project,
        member: IProjectMemberWithRole
    ): Promise<void> {
        if (member.role.key === EnumRoleProjectKey.admin) {
            await this.assertNotLastAdmin(project.id);
        }

        try {
            await this.outboxService.withTransaction(async tx => {
                const removed =
                    await this.projectMemberRepository.removeByIdInTx(
                        tx,
                        member.id
                    );
                if (!removed) {
                    throw new ProjectMemberNotFoundException();
                }

                const entry = this.activityLogService.recordEffect(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    {
                        action: EnumActivityLogAction.projectMemberLeft,
                        userId: member.userId,
                        createdBy: member.userId,
                        workspaceId: project.workspaceId,
                    }
                );
                await this.outboxService.addInTx(tx, entry);
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new ProjectMemberNotFoundException();
            }

            throw new AppUnknownException(err);
        }
    }
}
