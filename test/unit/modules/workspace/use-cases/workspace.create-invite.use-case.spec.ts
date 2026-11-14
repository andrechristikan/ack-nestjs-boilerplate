import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumProjectMemberRole,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Project,
    User,
    Workspace,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { ProjectService } from '@modules/project/services/project.service';
import { UserService } from '@modules/user/services/user.service';
import type { WorkspaceInviteCreateRequestDto } from '@modules/workspace/dtos/request/workspace.invite-create.request.dto';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceInviteDuplicateException } from '@modules/workspace/exceptions/workspace.invite-duplicate.exception';
import { WorkspaceInviteRoleRequiredException } from '@modules/workspace/exceptions/workspace.invite-role-required.exception';
import { WorkspaceInviteProjectMismatchException } from '@modules/workspace/exceptions/workspace.invite-project-mismatch.exception';
import { WorkspaceMemberAlreadyExistsException } from '@modules/workspace/exceptions/workspace.member-already-exists.exception';
import type {
    IWorkspaceInviteNotice,
    IWorkspaceInviteTokenData,
} from '@modules/workspace/interfaces/workspace.interface';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import {
    buildUser,
    buildWorkspaceMember,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
    buildWorkspaceContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { WorkspaceCreateInviteUseCase } from '@modules/workspace/use-cases/workspace.create-invite.use-case';

describe('WorkspaceCreateInviteUseCase', () => {
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const projectService: MockProxy<ProjectService> = mock<ProjectService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const workspace: Workspace = {
        id: 'workspace-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-1',
        deletedAt: null,
        deletedBy: null,
        name: 'Acme',
        slug: 'acme-team',
        description: null,
        isPublic: false,
    };
    const invite: WorkspaceInvite = {
        id: 'invite-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-1',
        workspaceId: 'workspace-1',
        email: 'invitee@example.com',
        token: 'hashed-token',
        workspaceRole: EnumWorkspaceMemberRole.member,
        projectId: null,
        projectRole: null,
        reference: 'WIN-abc123',
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        status: EnumWorkspaceInviteStatus.pending,
        invitedByUserId: 'user-1',
        acceptedAt: null,
        acceptedByUserId: null,
        nonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
    const project: Project = {
        id: 'project-1',
        workspaceId: 'workspace-1',
        name: 'Launch',
        slug: 'launch',
        description: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-1',
        deletedAt: null,
        deletedBy: null,
    };
    const existingUser: User = {
        id: 'user-2',
        name: 'Jane Doe',
        username: 'jane',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'invitee@example.com',
        roleId: 'role-1',
        password: null,
        passwordExpired: null,
        passwordCreated: null,
        passwordAttempt: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-1',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: EnumUserLoginFrom.website,
        lastLoginWith: EnumUserLoginWith.credential,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };
    const tokenData: IWorkspaceInviteTokenData = {
        token: 'token-value',
        hashedToken: 'hashed-token',
        reference: 'WIN-abc123',
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        claimLink:
            'https://app.example.com/workspace/invites?inviteToken=token-value',
        signUpLink: 'https://app.example.com/sign-up/token-value',
    };
    const notice: IWorkspaceInviteNotice = {
        workspaceName: 'Acme',
        inviterName: 'Jane Doe',
        inviteeUserId: null,
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('user-1', 'jane@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);
    const workspaceContext = buildWorkspaceContext(
        workspace,
        buildWorkspaceMember('user-1')
    );

    let useCase: WorkspaceCreateInviteUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceCreateInviteUseCase,
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                { provide: ProjectService, useValue: projectService },
                { provide: UserService, useValue: userService },
            ],
        }).compile();

        useCase = module.get(WorkspaceCreateInviteUseCase);
    });

    describe('execute', () => {
        const body: WorkspaceInviteCreateRequestDto = {
            email: 'invitee@example.com' as Lowercase<string>,
            workspaceRole: EnumWorkspaceMemberRole.member,
        };
        beforeEach(() => {
            userService.getOneActiveByEmail.mockResolvedValue(null);
            workspaceInviteService.getInviterName.mockResolvedValue('Jane Doe');
            workspaceInviteService.createInvite.mockResolvedValue({
                invite,
                tokenData,
            });
        });

        it('checks, reads the inviter, then writes with the notice and the context for an invitee with no account', async () => {
            const callOrder: string[] = [];
            userService.getOneActiveByEmail.mockImplementation(async () => {
                callOrder.push('lookup');

                return null;
            });
            workspaceInviteService.assertProjectRolePaired.mockImplementation(
                async () => {
                    callOrder.push('paired');
                }
            );
            workspaceInviteService.assertCreatable.mockImplementation(() => {
                callOrder.push('assertCreatable');
            });
            workspaceInviteService.getInviterName.mockImplementation(
                async () => {
                    callOrder.push('inviterName');

                    return 'Jane Doe';
                }
            );
            workspaceInviteService.createInvite.mockImplementation(async () => {
                callOrder.push('create');

                return { invite, tokenData };
            });

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                body
            );

            expect(result).toEqual({ data: invite });
            expect(callOrder[0]).toBe('paired');
            expect(callOrder.indexOf('assertCreatable')).toBeGreaterThan(
                callOrder.indexOf('lookup')
            );
            expect(callOrder.indexOf('inviterName')).toBeGreaterThan(
                callOrder.indexOf('assertCreatable')
            );
            expect(callOrder.at(-1)).toBe('create');
            expect(
                projectService.getActiveByIdAndWorkspace
            ).not.toHaveBeenCalled();
            expect(userService.getOneActiveByEmail).toHaveBeenCalledWith(
                'invitee@example.com'
            );
            expect(workspaceInviteService.assertCreatable).toHaveBeenCalledWith(
                {
                    email: 'invitee@example.com',
                    workspaceRole: EnumWorkspaceMemberRole.member,
                    projectId: null,
                    projectRole: null,
                    expiryDuration: null,
                },
                null
            );
            expect(
                workspaceInviteService.assertInviteeNotMember
            ).not.toHaveBeenCalled();
            expect(workspaceInviteService.createInvite).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                {
                    email: 'invitee@example.com',
                    workspaceRole: EnumWorkspaceMemberRole.member,
                    projectId: null,
                    projectRole: null,
                    expiryDuration: null,
                },
                notice
            );
        });

        it('passes the invitee user id in the notice when the invitee has an account', async () => {
            userService.getOneActiveByEmail.mockResolvedValue(existingUser);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                body
            );

            expect(workspaceInviteService.createInvite).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                expect.objectContaining({ email: 'invitee@example.com' }),
                { ...notice, inviteeUserId: 'user-2' }
            );
        });

        it('looks up the active project and forwards the project fields and expiry when given', async () => {
            projectService.getActiveByIdAndWorkspace.mockResolvedValue(project);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                {
                    ...body,
                    projectId: 'project-1',
                    projectRole: EnumProjectMemberRole.member,
                    expiryDuration: 14,
                } as WorkspaceInviteCreateRequestDto
            );

            expect(
                projectService.getActiveByIdAndWorkspace
            ).toHaveBeenCalledWith('project-1', 'workspace-1');
            expect(workspaceInviteService.assertCreatable).toHaveBeenCalledWith(
                expect.objectContaining({
                    projectId: 'project-1',
                    projectRole: EnumProjectMemberRole.member,
                    expiryDuration: 14,
                }),
                project
            );
            expect(workspaceInviteService.createInvite).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                'workspace-1',
                expect.objectContaining({ expiryDuration: 14 }),
                notice
            );
        });

        it('reads the project and the invitee together after the pairing gate', async () => {
            const deferredProject = buildDeferred<Project | null>();
            projectService.getActiveByIdAndWorkspace.mockReturnValue(
                deferredProject.promise
            );
            userService.getOneActiveByEmail.mockImplementation(async () => {
                deferredProject.resolve(project);

                return null;
            });

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                {
                    ...body,
                    projectId: 'project-1',
                    projectRole: EnumProjectMemberRole.member,
                } as WorkspaceInviteCreateRequestDto
            );

            expect(workspaceInviteService.assertCreatable).toHaveBeenCalledWith(
                expect.objectContaining({ projectId: 'project-1' }),
                project
            );
        });

        it('runs no query when the project pairing gate rejects', async () => {
            workspaceInviteService.assertProjectRolePaired.mockRejectedValue(
                new WorkspaceInviteRoleRequiredException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    body
                )
            ).rejects.toBeInstanceOf(WorkspaceInviteRoleRequiredException);
            expect(
                projectService.getActiveByIdAndWorkspace
            ).not.toHaveBeenCalled();
            expect(userService.getOneActiveByEmail).not.toHaveBeenCalled();
        });

        it('writes nothing when the creation check rejects', async () => {
            workspaceInviteService.assertCreatable.mockImplementation(() => {
                throw new WorkspaceInviteProjectMismatchException();
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    body
                )
            ).rejects.toBeInstanceOf(WorkspaceInviteProjectMismatchException);
            expect(workspaceInviteService.createInvite).not.toHaveBeenCalled();
        });

        it('checks the existing user is not a member before the write', async () => {
            userService.getOneActiveByEmail.mockResolvedValue(existingUser);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                workspaceContext,
                body
            );

            expect(
                workspaceInviteService.assertInviteeNotMember
            ).toHaveBeenCalledWith('workspace-1', 'user-2');
            expect(
                workspaceInviteService.assertInviteeNotMember
            ).toHaveBeenCalledBefore(workspaceInviteService.createInvite);
        });

        it('throws WorkspaceMemberAlreadyExistsException and writes nothing when the invitee is already a member', async () => {
            userService.getOneActiveByEmail.mockResolvedValue(existingUser);
            workspaceInviteService.assertInviteeNotMember.mockRejectedValue(
                new WorkspaceMemberAlreadyExistsException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    body
                )
            ).rejects.toBeInstanceOf(WorkspaceMemberAlreadyExistsException);
            expect(workspaceInviteService.createInvite).not.toHaveBeenCalled();
        });

        it('creates nothing when the inviter name read rejects', async () => {
            const failure = new Error('read-failed');
            workspaceInviteService.getInviterName.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    body
                )
            ).rejects.toBe(failure);
            expect(workspaceInviteService.createInvite).not.toHaveBeenCalled();
        });

        it('rejects with the write failure', async () => {
            workspaceInviteService.createInvite.mockRejectedValue(
                new WorkspaceInviteDuplicateException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    workspaceContext,
                    body
                )
            ).rejects.toBeInstanceOf(WorkspaceInviteDuplicateException);
        });
    });
});
