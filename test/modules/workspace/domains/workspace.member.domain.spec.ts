import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import {
    EnumActivityLogAction,
    EnumRoleScope,
    type Workspace,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.workspace-key.enum';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleScopeMismatchException } from '@modules/role/exceptions/role.scope-mismatch.exception';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceLastOwnerException } from '@modules/workspace/exceptions/workspace.last-owner.exception';
import { WorkspaceMemberForbiddenException } from '@modules/workspace/exceptions/workspace.member-forbidden.exception';
import { WorkspaceMemberNotFoundException } from '@modules/workspace/exceptions/workspace.member-not-found.exception';
import { WorkspaceMemberPeerForbiddenException } from '@modules/workspace/exceptions/workspace.member-peer-forbidden.exception';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceOwnerRoleNotAssignableException } from '@modules/workspace/exceptions/workspace.owner-role-not-assignable.exception';
import { WorkspaceSelfTransferException } from '@modules/workspace/exceptions/workspace.self-transfer.exception';
import type {
    IWorkspaceMemberWithRole,
    IWorkspaceMemberWithRolePolicies,
} from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';
import { WorkspaceRepository } from '@modules/workspace/repositories/workspace.repository';

const now = new Date('2026-01-01T00:00:00.000Z');
const buildRole = (key: EnumRoleWorkspaceKey): IRole => ({
    id: `${key}-role-id`,
    scope: EnumRoleScope.workspace,
    key,
    name: key,
});
const workspace: Workspace = {
    id: 'workspace-id',
    name: 'Workspace',
    slug: 'workspace',
    description: null,
    isPublic: false,
    createdAt: now,
    createdBy: null,
    updatedAt: now,
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
};
const buildMember = ({
    id,
    userId,
    key,
}: {
    id: string;
    userId: string;
    key: EnumRoleWorkspaceKey;
}): IWorkspaceMemberWithRole => ({
    id,
    userId,
    workspaceId: 'workspace-id',
    roleId: `${key}-role-id`,
    role: buildRole(key),
    joinedAt: now,
    createdAt: now,
    createdBy: null,
    updatedAt: now,
    updatedBy: null,
});

describe('WorkspaceMemberDomain', () => {
    const memberRepository: MockProxy<WorkspaceMemberRepository> =
        mock<WorkspaceMemberRepository>();
    const workspaceRepository: MockProxy<WorkspaceRepository> =
        mock<WorkspaceRepository>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const owner = buildMember({
        id: 'owner-member-id',
        userId: 'owner-id',
        key: EnumRoleWorkspaceKey.owner,
    });
    const admin = buildMember({
        id: 'admin-member-id',
        userId: 'admin-id',
        key: EnumRoleWorkspaceKey.admin,
    });
    const otherAdmin = buildMember({
        id: 'other-admin-member-id',
        userId: 'other-admin-id',
        key: EnumRoleWorkspaceKey.admin,
    });
    const member = buildMember({
        id: 'member-id',
        userId: 'member-user-id',
        key: EnumRoleWorkspaceKey.member,
    });
    const ownerRole = buildRole(EnumRoleWorkspaceKey.owner);
    const adminRole = buildRole(EnumRoleWorkspaceKey.admin);
    const memberRole = buildRole(EnumRoleWorkspaceKey.member);

    let domain: WorkspaceMemberDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceMemberDomain,
                {
                    provide: WorkspaceMemberRepository,
                    useValue: memberRepository,
                },
                { provide: WorkspaceRepository, useValue: workspaceRepository },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: RoleDomain, useValue: roleDomain },
            ],
        }).compile();

        domain = module.get(WorkspaceMemberDomain);
    });

    describe('validateWorkspaceMemberGuard', () => {
        const memberWithPolicies: IWorkspaceMemberWithRolePolicies = {
            ...member,
            role: {
                ...member.role,
                description: null,
                createdAt: now,
                createdBy: null,
                updatedAt: now,
                updatedBy: null,
                policies: [],
            },
        };

        it('rejects member validation without a user', async () => {
            await expect(
                domain.validateWorkspaceMemberGuard('workspace-id', null)
            ).rejects.toBeInstanceOf(AuthJwtAccessTokenInvalidException);
        });

        it('rejects member validation without a workspace', async () => {
            await expect(
                domain.validateWorkspaceMemberGuard(null, 'user-id')
            ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
        });

        it('rejects a user who is not a workspace member', async () => {
            memberRepository.findOneWithRoleByWorkspaceAndUser.mockResolvedValue(
                null
            );

            await expect(
                domain.validateWorkspaceMemberGuard('workspace-id', 'user-id')
            ).rejects.toBeInstanceOf(WorkspaceMemberForbiddenException);
        });

        it('returns the member with its role after asserting the role scope is workspace', async () => {
            memberRepository.findOneWithRoleByWorkspaceAndUser.mockResolvedValue(
                memberWithPolicies
            );

            await expect(
                domain.validateWorkspaceMemberGuard('workspace-id', 'user-id')
            ).resolves.toBe(memberWithPolicies);
            expect(
                memberRepository.findOneWithRoleByWorkspaceAndUser
            ).toHaveBeenCalledWith('workspace-id', 'user-id');
            expect(roleDomain.assertScope).toHaveBeenCalledWith(
                memberWithPolicies.role,
                EnumRoleScope.workspace
            );
        });

        it('propagates a role scope mismatch from the role domain', async () => {
            memberRepository.findOneWithRoleByWorkspaceAndUser.mockResolvedValue(
                memberWithPolicies
            );
            roleDomain.assertScope.mockImplementation(() => {
                throw new RoleScopeMismatchException();
            });

            await expect(
                domain.validateWorkspaceMemberGuard('workspace-id', 'user-id')
            ).rejects.toBeInstanceOf(RoleScopeMismatchException);
        });
    });

    describe('getOneByWorkspaceAndUser', () => {
        it('returns the membership row the repository finds', async () => {
            memberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                member
            );

            await expect(
                domain.getOneByWorkspaceAndUser('workspace-id', 'user-id')
            ).resolves.toBe(member);
            expect(
                memberRepository.findOneByWorkspaceAndUser
            ).toHaveBeenCalledWith('workspace-id', 'user-id');
        });
    });

    describe('createInTx', () => {
        it('creates the member with the resolved role id inside the caller transaction', async () => {
            const tx = mock<IDatabaseTransactionClient>();
            memberRepository.createInTx.mockResolvedValue(member);

            await expect(
                domain.createInTx(
                    tx,
                    'workspace-id',
                    'user-id',
                    memberRole.id,
                    'actor-id'
                )
            ).resolves.toBe(member);
            expect(memberRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'workspace-id',
                'user-id',
                memberRole.id,
                'actor-id'
            );
        });
    });

    describe('transferOwnership', () => {
        it('rejects a non-owner actor before any repository read', async () => {
            await expect(
                domain.transferOwnership('workspace-id', admin, member.userId)
            ).rejects.toBeInstanceOf(WorkspaceMemberPeerForbiddenException);
            expect(
                memberRepository.findOneByWorkspaceAndUser
            ).not.toHaveBeenCalled();
        });

        it('rejects transferring ownership to oneself', async () => {
            await expect(
                domain.transferOwnership('workspace-id', owner, owner.userId)
            ).rejects.toBeInstanceOf(WorkspaceSelfTransferException);
            expect(
                memberRepository.findOneByWorkspaceAndUser
            ).not.toHaveBeenCalled();
        });

        it('rejects transferring ownership to a non-member', async () => {
            memberRepository.findOneByWorkspaceAndUser.mockResolvedValue(null);

            await expect(
                domain.transferOwnership('workspace-id', owner, 'missing')
            ).rejects.toBeInstanceOf(WorkspaceMemberNotFoundException);
            expect(roleDomain.getByScopeAndKey).not.toHaveBeenCalled();
        });

        it.each([
            ['owner', EnumRoleWorkspaceKey.owner],
            ['admin', EnumRoleWorkspaceKey.admin],
        ])(
            'rejects with RoleNotFoundException when the %s catalog role is missing',
            async (_name, missingKey) => {
                memberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                    member
                );
                roleDomain.getByScopeAndKey.mockImplementation(
                    async (_scope, key) => {
                        if (key === missingKey) {
                            return null;
                        }

                        return key === EnumRoleWorkspaceKey.owner
                            ? ownerRole
                            : adminRole;
                    }
                );

                await expect(
                    domain.transferOwnership(
                        'workspace-id',
                        owner,
                        member.userId
                    )
                ).rejects.toBeInstanceOf(RoleNotFoundException);
                expect(
                    memberRepository.transferOwnership
                ).not.toHaveBeenCalled();
                expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            }
        );

        it('swaps owner and admin roles through the resolved catalog ids and stages the activity', async () => {
            memberRepository.findOneByWorkspaceAndUser.mockResolvedValue(
                member
            );
            roleDomain.getByScopeAndKey.mockImplementation(
                async (_scope, key) =>
                    key === EnumRoleWorkspaceKey.owner ? ownerRole : adminRole
            );

            await domain.transferOwnership(
                'workspace-id',
                owner,
                member.userId
            );

            expect(roleDomain.getByScopeAndKey).toHaveBeenCalledWith(
                EnumRoleScope.workspace,
                EnumRoleWorkspaceKey.owner
            );
            expect(roleDomain.getByScopeAndKey).toHaveBeenCalledWith(
                EnumRoleScope.workspace,
                EnumRoleWorkspaceKey.admin
            );
            expect(memberRepository.transferOwnership).toHaveBeenCalledWith(
                owner.id,
                member.id,
                ownerRole.id,
                adminRole.id
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceOwnershipTransferred,
                userId: owner.userId,
                createdBy: owner.userId,
                workspaceId: 'workspace-id',
                metadata: { targetUserId: member.userId },
            });
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceOwnershipTransferredByOwner,
                userId: member.userId,
                createdBy: owner.userId,
                workspaceId: 'workspace-id',
                metadata: { actorUserId: owner.userId },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledOnce();
        });
    });

    describe('leaveWorkspace', () => {
        it('prevents the last owner from leaving', async () => {
            memberRepository.countOwners.mockResolvedValue(1);

            await expect(
                domain.leaveWorkspace('workspace-id', owner)
            ).rejects.toBeInstanceOf(WorkspaceLastOwnerException);
            expect(memberRepository.removeMember).not.toHaveBeenCalled();
        });

        it('lets an owner leave when another owner remains', async () => {
            memberRepository.countOwners.mockResolvedValue(2);

            await domain.leaveWorkspace('workspace-id', owner);

            expect(memberRepository.countOwners).toHaveBeenCalledWith(
                'workspace-id'
            );
            expect(memberRepository.removeMember).toHaveBeenCalledWith(
                owner.id
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceMemberLeft,
                userId: owner.userId,
                createdBy: owner.userId,
                workspaceId: 'workspace-id',
            });
        });

        it.each([
            ['admin', admin],
            ['member', member],
        ])(
            'lets a %s leave without counting owners',
            async (_name, leaving) => {
                await domain.leaveWorkspace('workspace-id', leaving);

                expect(memberRepository.countOwners).not.toHaveBeenCalled();
                expect(memberRepository.removeMember).toHaveBeenCalledWith(
                    leaving.id
                );
            }
        );
    });

    describe('getMembersList', () => {
        it('forwards the pagination params and the role key filter to the repository', async () => {
            const paginated = {
                type: EnumPaginationType.cursor as const,
                count: 0,
                perPage: 10,
                hasNext: false,
                cursor: undefined,
                data: [],
            };
            const pagination = {
                limit: 10,
                orderBy: [],
            };
            const role = { role: { in: [EnumRoleWorkspaceKey.admin] } };
            memberRepository.findWithPaginationCursor.mockResolvedValue(
                paginated
            );

            await expect(
                domain.getMembersList('workspace-id', pagination, role)
            ).resolves.toBe(paginated);
            expect(
                memberRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('workspace-id', pagination, role);
        });
    });

    describe('updateMemberRole', () => {
        it('rejects updating the role of a member that is not found', async () => {
            memberRepository.findByIdAndWorkspace.mockResolvedValue(null);

            await expect(
                domain.updateMemberRole(
                    'workspace-id',
                    admin,
                    'missing-id',
                    memberRole.id
                )
            ).rejects.toBeInstanceOf(WorkspaceMemberNotFoundException);
            expect(roleDomain.resolve).not.toHaveBeenCalled();
        });

        it.each([
            ['an owner target', admin, owner],
            ['an admin target', admin, otherAdmin],
        ])(
            'prevents %s from being changed by an admin before the role is resolved',
            async (_name, actor, target) => {
                memberRepository.findByIdAndWorkspace.mockResolvedValue(target);

                await expect(
                    domain.updateMemberRole(
                        'workspace-id',
                        actor,
                        target.id,
                        memberRole.id
                    )
                ).rejects.toBeInstanceOf(WorkspaceMemberPeerForbiddenException);
                expect(roleDomain.resolve).not.toHaveBeenCalled();
                expect(memberRepository.updateRole).not.toHaveBeenCalled();
            }
        );

        it('propagates a role that cannot be resolved in the workspace scope', async () => {
            memberRepository.findByIdAndWorkspace.mockResolvedValue(member);
            roleDomain.resolve.mockRejectedValue(new RoleNotFoundException());

            await expect(
                domain.updateMemberRole(
                    'workspace-id',
                    admin,
                    member.id,
                    'missing-role-id'
                )
            ).rejects.toBeInstanceOf(RoleNotFoundException);
            expect(roleDomain.resolve).toHaveBeenCalledWith(
                'missing-role-id',
                EnumRoleScope.workspace
            );
            expect(memberRepository.updateRole).not.toHaveBeenCalled();
        });

        it('propagates a role scope mismatch', async () => {
            memberRepository.findByIdAndWorkspace.mockResolvedValue(member);
            roleDomain.resolve.mockRejectedValue(
                new RoleScopeMismatchException()
            );

            await expect(
                domain.updateMemberRole(
                    'workspace-id',
                    admin,
                    member.id,
                    'project-role-id'
                )
            ).rejects.toBeInstanceOf(RoleScopeMismatchException);
            expect(memberRepository.updateRole).not.toHaveBeenCalled();
        });

        it('rejects assigning the owner role', async () => {
            memberRepository.findByIdAndWorkspace.mockResolvedValue(member);
            roleDomain.resolve.mockResolvedValue(ownerRole);

            const promise = domain.updateMemberRole(
                'workspace-id',
                owner,
                member.id,
                ownerRole.id
            );

            await expect(promise).rejects.toBeInstanceOf(
                WorkspaceOwnerRoleNotAssignableException
            );
            await expect(promise).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.ownerRoleNotAssignable,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.ownerRoleNotAssignable
                    ],
                messagePath: 'workspace.error.ownerRoleNotAssignable',
            });
            expect(memberRepository.updateRole).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('updates the role through the resolved role id and stages the activity', async () => {
            memberRepository.findByIdAndWorkspace.mockResolvedValue(member);
            roleDomain.resolve.mockResolvedValue(adminRole);

            await domain.updateMemberRole(
                'workspace-id',
                owner,
                member.id,
                adminRole.id
            );

            expect(roleDomain.resolve).toHaveBeenCalledWith(
                adminRole.id,
                EnumRoleScope.workspace
            );
            expect(memberRepository.updateRole).toHaveBeenCalledWith(
                member.id,
                adminRole.id
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceMemberRoleUpdated,
                userId: owner.userId,
                createdBy: owner.userId,
                workspaceId: 'workspace-id',
                metadata: { targetUserId: member.userId },
            });
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceMemberRoleUpdatedByAdmin,
                userId: member.userId,
                createdBy: owner.userId,
                workspaceId: 'workspace-id',
                metadata: { actorUserId: owner.userId },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledOnce();
        });

        it('lets an owner change the role of an admin', async () => {
            memberRepository.findByIdAndWorkspace.mockResolvedValue(otherAdmin);
            roleDomain.resolve.mockResolvedValue(memberRole);

            await domain.updateMemberRole(
                'workspace-id',
                owner,
                otherAdmin.id,
                memberRole.id
            );

            expect(memberRepository.updateRole).toHaveBeenCalledWith(
                otherAdmin.id,
                memberRole.id
            );
        });

        it('skips the paired activity row when the actor changes its own role', async () => {
            memberRepository.findByIdAndWorkspace.mockResolvedValue({
                ...member,
                userId: admin.userId,
            });
            roleDomain.resolve.mockResolvedValue(memberRole);

            await domain.updateMemberRole(
                'workspace-id',
                admin,
                member.id,
                memberRole.id
            );

            expect(activityLogDomain.prepare).toHaveBeenCalledOnce();
        });
    });

    describe('removeMember', () => {
        it('prevents a member from removing itself', async () => {
            memberRepository.findByIdAndWorkspace.mockResolvedValue(member);

            await expect(
                domain.removeMember('workspace-id', member, member.id)
            ).rejects.toBeInstanceOf(WorkspaceMemberPeerForbiddenException);
        });

        it('rejects removing a member that is not found', async () => {
            memberRepository.findByIdAndWorkspace.mockResolvedValue(null);

            await expect(
                domain.removeMember('workspace-id', admin, 'missing-id')
            ).rejects.toBeInstanceOf(WorkspaceMemberNotFoundException);
        });

        it.each([
            ['an owner', owner],
            ['another admin', otherAdmin],
        ])('prevents an admin from removing %s', async (_name, target) => {
            memberRepository.findByIdAndWorkspace.mockResolvedValue(target);

            await expect(
                domain.removeMember('workspace-id', admin, target.id)
            ).rejects.toBeInstanceOf(WorkspaceMemberPeerForbiddenException);
            expect(memberRepository.removeMember).not.toHaveBeenCalled();
        });

        it('removes a member and stages the activity rows', async () => {
            memberRepository.findByIdAndWorkspace.mockResolvedValue(member);

            await domain.removeMember('workspace-id', admin, member.id);

            expect(memberRepository.removeMember).toHaveBeenCalledWith(
                member.id
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceMemberRemoved,
                userId: admin.userId,
                createdBy: admin.userId,
                workspaceId: 'workspace-id',
                metadata: { targetUserId: member.userId },
            });
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.workspaceMemberRemovedByAdmin,
                userId: member.userId,
                createdBy: admin.userId,
                workspaceId: 'workspace-id',
                metadata: { actorUserId: admin.userId },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledOnce();
        });

        it('lets an owner remove an admin', async () => {
            memberRepository.findByIdAndWorkspace.mockResolvedValue(otherAdmin);

            await domain.removeMember('workspace-id', owner, otherAdmin.id);

            expect(memberRepository.removeMember).toHaveBeenCalledWith(
                otherAdmin.id
            );
        });
    });

    describe('getMembersListForAdmin', () => {
        const pagination = { limit: 10, skip: 0, orderBy: [] };
        const paginated = {
            type: EnumPaginationType.offset as const,
            count: 0,
            perPage: 10,
            page: 1,
            totalPage: 0,
            hasNext: false,
            hasPrevious: false,
            data: [],
        };

        it('rejects when the workspace does not exist', async () => {
            workspaceRepository.findByIdForAdmin.mockResolvedValue(null);
            memberRepository.findWithPaginationOffset.mockResolvedValue(
                paginated
            );

            await expect(
                domain.getMembersListForAdmin('workspace-id', pagination)
            ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
        });

        it('returns the offset page of an existing workspace', async () => {
            workspaceRepository.findByIdForAdmin.mockResolvedValue(workspace);
            memberRepository.findWithPaginationOffset.mockResolvedValue(
                paginated
            );

            await expect(
                domain.getMembersListForAdmin('workspace-id', pagination)
            ).resolves.toBe(paginated);
            expect(
                memberRepository.findWithPaginationOffset
            ).toHaveBeenCalledWith('workspace-id', pagination);
        });
    });
});
