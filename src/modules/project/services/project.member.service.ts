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
    EnumProjectMemberRole,
    Prisma,
} from '@generated/prisma-client/client';
import type {
    Project,
    ProjectMember,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { ProjectMemberAlreadyAssignedException } from '@modules/project/exceptions/project.member-already-assigned.exception';
import { ProjectMemberForbiddenException } from '@modules/project/exceptions/project.member-forbidden.exception';
import { ProjectMemberNotFoundException } from '@modules/project/exceptions/project.member-not-found.exception';
import { ProjectMemberPeerForbiddenException } from '@modules/project/exceptions/project.member-peer-forbidden.exception';
import { ProjectRoleForbiddenException } from '@modules/project/exceptions/project.role-forbidden.exception';
import type {
    IProjectMember,
    IProjectMemberActor,
} from '@modules/project/interfaces/project.interface';
import { ProjectMemberRepository } from '@modules/project/repositories/project.member.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectMemberService {
    constructor(
        private readonly projectMemberRepository: ProjectMemberRepository,
        private readonly projectUtil: ProjectUtil,
        private readonly outboxService: OutboxService,
        private readonly activityLogService: ActivityLogService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    assertPeerAllowed(
        { hasWorkspaceBypass }: IProjectMemberActor,
        ...rolesInvolved: EnumProjectMemberRole[]
    ): void {
        if (
            !hasWorkspaceBypass &&
            rolesInvolved.includes(EnumProjectMemberRole.admin)
        ) {
            throw new ProjectMemberPeerForbiddenException();
        }
    }

    async validateProjectMemberGuard(
        projectId: string,
        userId: string
    ): Promise<ProjectMember> {
        const member =
            await this.projectMemberRepository.findOneByProjectAndUser(
                projectId,
                userId
            );
        if (!member) {
            throw new ProjectMemberForbiddenException();
        }

        return member;
    }

    async validateProjectRoleGuard(
        projectId: string,
        workspaceMember: WorkspaceMember,
        allowedProjectRoles: EnumProjectMemberRole[]
    ): Promise<void> {
        const hasWorkspaceBypass =
            this.projectUtil.hasWorkspaceBypass(workspaceMember);
        if (hasWorkspaceBypass) {
            return;
        }

        const member =
            await this.projectMemberRepository.findOneByProjectAndUser(
                projectId,
                workspaceMember.userId
            );
        if (!member) {
            throw new ProjectMemberForbiddenException();
        } else if (!allowedProjectRoles.includes(member.role)) {
            throw new ProjectRoleForbiddenException();
        }
    }

    async getMembersList(
        project: Project,
        pagination: IPaginationQueryCursorParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePaginationReturn<IProjectMember>> {
        return this.projectMemberRepository.findWithPaginationCursor(
            project.id,
            pagination
        );
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        userId: string,
        role: EnumProjectMemberRole,
        createdBy: string
    ): Promise<IProjectMember> {
        return this.projectMemberRepository.createInTx(
            tx,
            projectId,
            userId,
            role,
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
        project: Project,
        actor: IProjectMemberActor,
        targetMember: WorkspaceMember | null,
        role: EnumProjectMemberRole,
        context: IRequestContext
    ): Promise<IProjectMember> {
        this.assertPeerAllowed(actor, role);

        if (!targetMember || targetMember.workspaceId !== project.workspaceId) {
            throw new WorkspaceMemberNotFoundException();
        }

        try {
            return await this.outboxService.withTransaction(async tx => {
                const member = await this.projectMemberRepository.createInTx(
                    tx,
                    project.id,
                    targetMember.userId,
                    role,
                    actor.userId
                );
                const actorEntry = this.activityLogService.recordEffect(
                    {
                        action: EnumActivityLogAction.projectMemberAssigned,
                        userId: actor.userId,
                        createdBy: actor.userId,
                        workspaceId: project.workspaceId,
                        metadata: { targetUserId: targetMember.userId },
                    },
                    context
                );
                const entries = [actorEntry];
                if (targetMember.userId !== actor.userId) {
                    const assigneeEntry = this.activityLogService.recordEffect(
                        {
                            action: EnumActivityLogAction.projectMemberAssignedByAdmin,
                            userId: targetMember.userId,
                            createdBy: actor.userId,
                            workspaceId: project.workspaceId,
                            metadata: { actorUserId: actor.userId },
                        },
                        context
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
        project: Project,
        actor: IProjectMemberActor,
        targetMemberId: string,
        newRole: EnumProjectMemberRole,
        context: IRequestContext
    ): Promise<void> {
        const targetMember =
            await this.projectMemberRepository.findByIdAndProject(
                targetMemberId,
                project.id
            );
        if (!targetMember) {
            throw new ProjectMemberNotFoundException();
        }

        this.assertPeerAllowed(actor, targetMember.role, newRole);

        try {
            await this.outboxService.withTransaction(async tx => {
                const updated =
                    await this.projectMemberRepository.updateRoleInTx(
                        tx,
                        targetMember.id,
                        targetMember.role,
                        newRole
                    );
                if (!updated) {
                    throw new ProjectMemberPeerForbiddenException();
                }

                const actorEntry = this.activityLogService.recordEffect(
                    {
                        action: EnumActivityLogAction.projectMemberRoleUpdated,
                        userId: actor.userId,
                        createdBy: actor.userId,
                        workspaceId: project.workspaceId,
                        metadata: { targetUserId: targetMember.userId },
                    },
                    context
                );
                const entries = [actorEntry];
                if (targetMember.userId !== actor.userId) {
                    const targetEntry = this.activityLogService.recordEffect(
                        {
                            action: EnumActivityLogAction.projectMemberRoleUpdatedByAdmin,
                            userId: targetMember.userId,
                            createdBy: actor.userId,
                            workspaceId: project.workspaceId,
                            metadata: { actorUserId: actor.userId },
                        },
                        context
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
        project: Project,
        actor: IProjectMemberActor,
        targetMemberId: string,
        context: IRequestContext
    ): Promise<void> {
        const targetMember =
            await this.projectMemberRepository.findByIdAndProject(
                targetMemberId,
                project.id
            );
        if (!targetMember) {
            throw new ProjectMemberNotFoundException();
        }

        if (targetMember.userId === actor.userId) {
            throw new ProjectMemberPeerForbiddenException();
        }

        this.assertPeerAllowed(actor, targetMember.role);

        try {
            await this.outboxService.withTransaction(async tx => {
                const removed =
                    await this.projectMemberRepository.removeMemberInTx(
                        tx,
                        targetMember.id,
                        targetMember.role
                    );
                if (!removed) {
                    throw new ProjectMemberPeerForbiddenException();
                }

                const actorEntry = this.activityLogService.recordEffect(
                    {
                        action: EnumActivityLogAction.projectMemberRemoved,
                        userId: actor.userId,
                        createdBy: actor.userId,
                        workspaceId: project.workspaceId,
                        metadata: { targetUserId: targetMember.userId },
                    },
                    context
                );
                const targetEntry = this.activityLogService.recordEffect(
                    {
                        action: EnumActivityLogAction.projectMemberRemovedByAdmin,
                        userId: targetMember.userId,
                        createdBy: actor.userId,
                        workspaceId: project.workspaceId,
                        metadata: { actorUserId: actor.userId },
                    },
                    context
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
        project: Project,
        member: ProjectMember,
        context: IRequestContext
    ): Promise<void> {
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
                    {
                        action: EnumActivityLogAction.projectMemberLeft,
                        userId: member.userId,
                        createdBy: member.userId,
                        workspaceId: project.workspaceId,
                    },
                    context
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
