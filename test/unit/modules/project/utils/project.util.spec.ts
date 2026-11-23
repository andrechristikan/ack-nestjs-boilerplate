import type { IWorkspaceMemberWithRole } from '@modules/workspace/interfaces/workspace.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { EnumRoleScope } from '@generated/prisma-client/client';
import { ProjectUtil } from '@modules/project/utils/project.util';

describe('ProjectUtil', () => {
    let util: ProjectUtil;

    const member: IWorkspaceMemberWithRole = {
        id: '507f1f77bcf86cd799439011',
        workspaceId: '507f1f77bcf86cd799439012',
        userId: '507f1f77bcf86cd799439013',
        roleId: 'role-workspace-member',
        role: {
            id: 'role-workspace-member',
            scope: EnumRoleScope.workspace,
            key: 'member',
            name: 'member',
            policyRevision: 0,
        },
        joinedAt: new Date('2026-01-01T00:00:00.000Z'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [ProjectUtil],
        }).compile();

        util = module.get(ProjectUtil);
    });

    describe('hasWorkspaceBypass', () => {
        it('returns true when the workspace member role is owner', () => {
            const result = util.hasWorkspaceBypass({
                ...member,
                roleId: 'role-workspace-owner',
                role: {
                    id: 'role-workspace-owner',
                    scope: EnumRoleScope.workspace,
                    key: 'owner',
                    name: 'owner',
                    policyRevision: 0,
                },
            });

            expect(result).toBe(true);
        });

        it('returns true when the workspace member role is admin', () => {
            const result = util.hasWorkspaceBypass({
                ...member,
                roleId: 'role-workspace-admin',
                role: {
                    id: 'role-workspace-admin',
                    scope: EnumRoleScope.workspace,
                    key: 'admin',
                    name: 'admin',
                    policyRevision: 0,
                },
            });

            expect(result).toBe(true);
        });

        it('returns false when the workspace member role is member', () => {
            const result = util.hasWorkspaceBypass({
                ...member,
                roleId: 'role-workspace-member',
                role: {
                    id: 'role-workspace-member',
                    scope: EnumRoleScope.workspace,
                    key: 'member',
                    name: 'member',
                    policyRevision: 0,
                },
            });

            expect(result).toBe(false);
        });
    });

    describe('mapMemberActor', () => {
        it('maps the workspace member to its user id and workspace bypass', () => {
            const result = util.mapMemberActor({
                ...member,
                roleId: 'role-workspace-admin',
                role: {
                    id: 'role-workspace-admin',
                    scope: EnumRoleScope.workspace,
                    key: 'admin',
                    name: 'admin',
                    policyRevision: 0,
                },
            });

            expect(result).toEqual({
                userId: '507f1f77bcf86cd799439013',
                hasWorkspaceBypass: true,
            });
        });

        it('maps a plain workspace member to no bypass', () => {
            const result = util.mapMemberActor(member);

            expect(result).toEqual({
                userId: '507f1f77bcf86cd799439013',
                hasWorkspaceBypass: false,
            });
        });
    });
});
