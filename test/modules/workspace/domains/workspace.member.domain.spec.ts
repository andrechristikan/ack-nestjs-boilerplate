import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import {
    EnumActivityLogAction,
    EnumRoleScope,
    type Prisma,
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
import type { IWorkspaceMemberWithRole } from '@modules/workspace/interfaces/workspace.interface';
import { WorkspaceMemberRepository } from '@modules/workspace/repositories/workspace.member.repository';

const now = new Date('2026-01-01T00:00:00.000Z');
const buildRole = (key: EnumRoleWorkspaceKey): IRole => ({
    id: `${key}-role-id`,
    scope: EnumRoleScope.workspace,
    key,
    name: key,
});
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
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: RoleDomain, useValue: roleDomain },
            ],
        }).compile();

        domain = module.get(WorkspaceMemberDomain);
    });

    describe('validateWorkspaceMemberGuard', () => {
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
                member
            );

            await expect(
                domain.validateWorkspaceMemberGuard('workspace-id', 'user-id')
            ).resolves.toBe(member);
            expect(
                memberRepository.findOneWithRoleByWorkspaceAndUser
            ).toHaveBeenCalledWith('workspace-id', 'user-id');
            expect(roleDomain.assertScope).toHaveBeenCalledWith(
                member.role,
                EnumRoleScope.workspace
            );
        });

        it('propagates a role scope mismatch from the role domain', async () => {
            memberRepository.findOneWithRoleByWorkspaceAndUser.mockResolvedValue(
                member
            );
            roleDomain.assertScope.mockImplementation(() => {
                throw new RoleScopeMismatchException();
            });

            await expect(
                domain.validateWorkspaceMemberGuard('workspace-id', 'user-id')
            ).rejects.toBeInstanceOf(RoleScopeMismatchException);
        });
    });

    describe('getOneByIdAndWorkspace', () => {
        const where: Prisma.WorkspaceMemberWhereInput = {
            role: { key: EnumRoleWorkspaceKey.member },
        };

        it('returns the row the scoped read finds, forwarding the where after the workspace id', async () => {
            memberRepository.findByIdAndWorkspace.mockResolvedValue(member);

            await expect(
                domain.getOneByIdAndWorkspace('workspace-id', member.id, where)
            ).resolves.toBe(member);
            expect(memberRepository.findByIdAndWorkspace).toHaveBeenCalledWith(
                member.id,
                'workspace-id',
                where
            );
        });

        it('is callable without a where for a caller that holds no request ability', async () => {
            memberRepository.findByIdAndWorkspace.mockResolvedValue(member);

            await expect(
                domain.getOneByIdAndWorkspace('workspace-id', member.id)
            ).resolves.toBe(member);
            expect(memberRepository.findByIdAndWorkspace).toHaveBeenCalledWith(
                member.id,
                'workspace-id',
                undefined
            );
        });

        it.each([
            ['a where', where],
            ['no where', undefined],
        ])(
            'throws WorkspaceMemberNotFoundException when the read returns no row with %s',
            async (_name, scoped) => {
                memberRepository.findByIdAndWorkspace.mockResolvedValue(null);

                await expect(
                    domain.getOneByIdAndWorkspace(
                        'workspace-id',
                        'missing-id',
                        scoped
                    )
                ).rejects.toMatchObject({
                    module: 'workspace',
                    statusCode: EnumWorkspaceStatusCodeError.memberNotFound,
                    statusCodeKey:
                        EnumWorkspaceStatusCodeError[
                            EnumWorkspaceStatusCodeError.memberNotFound
                        ],
                    messagePath: 'workspace.error.memberNotFound',
                });
            }
        );
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

        it('stages only the actor event when the loaded target resolves to the actor', async () => {
            const actorEvent = { id: 'actor-event' } as never;
            memberRepository.findOneByWorkspaceAndUser.mockResolvedValue({
                ...member,
                userId: owner.userId,
            });
            roleDomain.getByScopeAndKey.mockImplementation(
                async (_scope, key) =>
                    key === EnumRoleWorkspaceKey.owner ? ownerRole : adminRole
            );
            activityLogDomain.prepare.mockReturnValue(actorEvent);

            await domain.transferOwnership(
                'workspace-id',
                owner,
                member.userId
            );

            expect(activityLogDomain.prepare).toHaveBeenCalledOnce();
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                actorEvent,
            ]);
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
            const where: Prisma.WorkspaceMemberWhereInput = {
                workspaceId: 'workspace-id',
            };
            memberRepository.findWithPaginationCursor.mockResolvedValue(
                paginated
            );

            await expect(
                domain.getMembersList('workspace-id', pagination, role, where)
            ).resolves.toBe(paginated);
            expect(
                memberRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith('workspace-id', pagination, role, where);
        });

        it('hands an undefined where to the repository when the caller supplies none', async () => {
            const pagination = {
                limit: 10,
                orderBy: [],
            };
            memberRepository.findWithPaginationCursor.mockResolvedValue({
                type: EnumPaginationType.cursor as const,
                count: 0,
                perPage: 10,
                hasNext: false,
                cursor: undefined,
                data: [],
            });

            await domain.getMembersList('workspace-id', pagination);

            expect(
                memberRepository.findWithPaginationCursor
            ).toHaveBeenCalledWith(
                'workspace-id',
                pagination,
                undefined,
                undefined
            );
        });
    });

    describe('updateMemberRole', () => {
        it('never re-reads the target the guard already authorized', async () => {
            roleDomain.resolve.mockResolvedValue(adminRole);

            await domain.updateMemberRole(
                'workspace-id',
                owner,
                member,
                adminRole.id
            );

            expect(
                memberRepository.findByIdAndWorkspace
            ).not.toHaveBeenCalled();
        });

        it.each([
            ['an owner target', admin, owner],
            ['an admin target', admin, otherAdmin],
        ])(
            'prevents %s from being changed by an admin before the role is resolved',
            async (_name, actor, target) => {
                await expect(
                    domain.updateMemberRole(
                        'workspace-id',
                        actor,
                        target,
                        memberRole.id
                    )
                ).rejects.toBeInstanceOf(WorkspaceMemberPeerForbiddenException);
                expect(roleDomain.resolve).not.toHaveBeenCalled();
                expect(memberRepository.updateRole).not.toHaveBeenCalled();
            }
        );

        it('propagates a role that cannot be resolved in the workspace scope', async () => {
            roleDomain.resolve.mockRejectedValue(new RoleNotFoundException());

            await expect(
                domain.updateMemberRole(
                    'workspace-id',
                    admin,
                    member,
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
            roleDomain.resolve.mockRejectedValue(
                new RoleScopeMismatchException()
            );

            await expect(
                domain.updateMemberRole(
                    'workspace-id',
                    admin,
                    member,
                    'project-role-id'
                )
            ).rejects.toBeInstanceOf(RoleScopeMismatchException);
            expect(memberRepository.updateRole).not.toHaveBeenCalled();
        });

        it('rejects assigning the owner role', async () => {
            roleDomain.resolve.mockResolvedValue(ownerRole);

            const promise = domain.updateMemberRole(
                'workspace-id',
                owner,
                member,
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
            roleDomain.resolve.mockResolvedValue(adminRole);

            await domain.updateMemberRole(
                'workspace-id',
                owner,
                member,
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
            roleDomain.resolve.mockResolvedValue(memberRole);

            await domain.updateMemberRole(
                'workspace-id',
                owner,
                otherAdmin,
                memberRole.id
            );

            expect(memberRepository.updateRole).toHaveBeenCalledWith(
                otherAdmin.id,
                memberRole.id
            );
        });

        it('skips the paired activity row when the actor changes its own role', async () => {
            roleDomain.resolve.mockResolvedValue(memberRole);

            await domain.updateMemberRole(
                'workspace-id',
                admin,
                { ...member, userId: admin.userId },
                memberRole.id
            );

            expect(activityLogDomain.prepare).toHaveBeenCalledOnce();
        });
    });

    describe('removeMember', () => {
        it('never re-reads the target the guard already authorized', async () => {
            await domain.removeMember('workspace-id', admin, member);

            expect(
                memberRepository.findByIdAndWorkspace
            ).not.toHaveBeenCalled();
        });

        it('prevents a member from removing itself', async () => {
            await expect(
                domain.removeMember('workspace-id', member, member)
            ).rejects.toBeInstanceOf(WorkspaceMemberPeerForbiddenException);
        });

        it.each([
            ['an owner', owner],
            ['another admin', otherAdmin],
        ])('prevents an admin from removing %s', async (_name, target) => {
            await expect(
                domain.removeMember('workspace-id', admin, target)
            ).rejects.toBeInstanceOf(WorkspaceMemberPeerForbiddenException);
            expect(memberRepository.removeMember).not.toHaveBeenCalled();
        });

        it('removes a member and stages the activity rows', async () => {
            await domain.removeMember('workspace-id', admin, member);

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
            await domain.removeMember('workspace-id', owner, otherAdmin);

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

        it('returns the offset page of the workspace', async () => {
            memberRepository.findWithPaginationOffset.mockResolvedValue(
                paginated
            );

            await expect(
                domain.getMembersListForAdmin('workspace-id', pagination)
            ).resolves.toBe(paginated);
            expect(
                memberRepository.findWithPaginationOffset
            ).toHaveBeenCalledWith(
                'workspace-id',
                pagination,
                undefined,
                undefined
            );
        });

        it('forwards the accessible where as the trailing repository argument', async () => {
            const accessibleWhere = { workspaceId: 'workspace-id' };
            memberRepository.findWithPaginationOffset.mockResolvedValue(
                paginated
            );

            await domain.getMembersListForAdmin(
                'workspace-id',
                pagination,
                accessibleWhere
            );

            expect(
                memberRepository.findWithPaginationOffset
            ).toHaveBeenCalledWith(
                'workspace-id',
                pagination,
                undefined,
                accessibleWhere
            );
        });
    });
});
