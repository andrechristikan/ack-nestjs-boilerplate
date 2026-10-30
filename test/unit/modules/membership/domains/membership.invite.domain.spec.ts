import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumProjectMemberRole,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    WorkspaceInvite,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import { MembershipInviteDomain } from '@modules/membership/domains/membership.invite.domain';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';

describe('MembershipInviteDomain', () => {
    const workspaceInviteDomain: MockProxy<WorkspaceInviteDomain> =
        mock<WorkspaceInviteDomain>();
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const projectMemberDomain: MockProxy<ProjectMemberDomain> =
        mock<ProjectMemberDomain>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();
    const now = new Date('2026-01-01T00:00:00.000Z');

    const invite: WorkspaceInvite = {
        id: 'invite-1',
        createdAt: now,
        createdBy: 'user-1',
        updatedAt: now,
        updatedBy: 'user-1',
        workspaceId: 'workspace-1',
        email: 'invitee@example.com',
        token: 'hashed-token',
        workspaceRole: EnumWorkspaceMemberRole.admin,
        projectId: null,
        projectRole: null,
        reference: 'WIN-abc123',
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        status: EnumWorkspaceInviteStatus.pending,
        invitedByUserId: 'user-1',
        acceptedAt: null,
        acceptedByUserId: null,
    };

    const existingMember: WorkspaceMember = {
        id: 'member-1',
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        workspaceId: 'workspace-1',
        userId: 'user-2',
        role: EnumWorkspaceMemberRole.member,
        joinedAt: now,
    };

    let domain: MembershipInviteDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));
        workspaceInviteDomain.validateInviteForEmail.mockResolvedValue(invite);
        workspaceMemberDomain.getOneByWorkspaceAndUser.mockResolvedValue(null);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MembershipInviteDomain,
                {
                    provide: WorkspaceInviteDomain,
                    useValue: workspaceInviteDomain,
                },
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                { provide: ProjectMemberDomain, useValue: projectMemberDomain },
                { provide: UserDomain, useValue: userDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        domain = module.get(MembershipInviteDomain);
    });

    describe('claim', () => {
        it('throws WorkspaceInviteInvalidException before any membership read when the token does not resolve', async () => {
            workspaceInviteDomain.validateInviteForEmail.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );

            await expect(
                domain.claim('user-2', 'invitee@example.com', 'raw-token')
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
                messagePath: 'workspace.error.inviteInvalid',
            });
            expect(
                workspaceMemberDomain.getOneByWorkspaceAndUser
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws WorkspaceInviteInvalidException when the caller is already a member', async () => {
            workspaceMemberDomain.getOneByWorkspaceAndUser.mockResolvedValue(
                existingMember
            );

            await expect(
                domain.claim('user-2', 'invitee@example.com', 'raw-token')
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteInvalidException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
                messagePath: 'workspace.error.inviteInvalid',
            });
            expect(
                workspaceMemberDomain.getOneByWorkspaceAndUser
            ).toHaveBeenCalledWith('workspace-1', 'user-2');
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('creates the membership, accepts the invite, and sets the last workspace on one transaction without a project', async () => {
            const calls: string[] = [];
            workspaceMemberDomain.createInTx.mockImplementation(async () => {
                calls.push('createMember');

                return existingMember;
            });
            workspaceInviteDomain.acceptPendingInTx.mockImplementation(
                async () => {
                    calls.push('acceptInvite');
                }
            );
            userDomain.setLastWorkspaceInTx.mockImplementation(async () => {
                calls.push('setLastWorkspace');
            });

            const result = await domain.claim(
                'user-2',
                'invitee@example.com',
                'raw-token'
            );

            expect(result).toBe(invite);
            expect(calls).toEqual([
                'createMember',
                'acceptInvite',
                'setLastWorkspace',
            ]);
            expect(
                workspaceInviteDomain.validateInviteForEmail
            ).toHaveBeenCalledWith('raw-token', 'invitee@example.com');
            expect(workspaceMemberDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'workspace-1',
                'user-2',
                EnumWorkspaceMemberRole.admin,
                'user-2'
            );
            expect(
                workspaceInviteDomain.acceptPendingInTx
            ).toHaveBeenCalledWith(tx, 'invite-1', 'user-2', now);
            expect(userDomain.setLastWorkspaceInTx).toHaveBeenCalledWith(
                tx,
                'user-2',
                'workspace-1'
            );
            expect(projectMemberDomain.createInTx).not.toHaveBeenCalled();
        });

        it('creates the project membership last when the invite carries a project and role', async () => {
            const projectInvite: WorkspaceInvite = {
                ...invite,
                projectId: 'project-1',
                projectRole: EnumProjectMemberRole.member,
            };
            workspaceInviteDomain.validateInviteForEmail.mockResolvedValue(
                projectInvite
            );
            const calls: string[] = [];
            userDomain.setLastWorkspaceInTx.mockImplementation(async () => {
                calls.push('setLastWorkspace');
            });
            projectMemberDomain.createInTx.mockImplementation(async () => {
                calls.push('createProjectMember');

                return mock();
            });

            await domain.claim('user-2', 'invitee@example.com', 'raw-token');

            expect(calls).toEqual(['setLastWorkspace', 'createProjectMember']);
            expect(projectMemberDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'project-1',
                'user-2',
                EnumProjectMemberRole.member,
                'user-2'
            );
        });

        it('propagates WorkspaceInviteAlreadyProcessedException from the guarded accept and writes nothing after it', async () => {
            workspaceInviteDomain.acceptPendingInTx.mockRejectedValue(
                new WorkspaceInviteAlreadyProcessedException()
            );

            await expect(
                domain.claim('user-2', 'invitee@example.com', 'raw-token')
            ).rejects.toMatchObject({
                constructor: WorkspaceInviteAlreadyProcessedException,
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
                messagePath: 'workspace.error.inviteAlreadyProcessed',
            });
            expect(userDomain.setLastWorkspaceInTx).not.toHaveBeenCalled();
            expect(projectMemberDomain.createInTx).not.toHaveBeenCalled();
        });
    });
});
