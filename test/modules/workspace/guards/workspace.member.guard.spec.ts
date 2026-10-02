import type { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumRoleScope } from '@generated/prisma-client';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.workspace-key.enum';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import {
    WorkspaceMemberStoreKey,
    WorkspaceStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceMemberGuard } from '@modules/workspace/guards/workspace.member.guard';
import type { IWorkspaceMemberWithRole } from '@modules/workspace/interfaces/workspace.interface';

describe('WorkspaceMemberGuard', () => {
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
    const joinedAt = new Date('2026-01-01T00:00:00.000Z');
    const member: IWorkspaceMemberWithRole = {
        id: 'member-id',
        workspaceId: 'workspace-id',
        userId: 'user-id',
        roleId: 'role-id',
        role: {
            id: 'role-id',
            scope: EnumRoleScope.workspace,
            key: EnumRoleWorkspaceKey.member,
            name: 'Member',
        },
        joinedAt,
        createdAt: joinedAt,
        createdBy: null,
        updatedAt: joinedAt,
        updatedBy: null,
    };
    let guard: WorkspaceMemberGuard;

    const seed = (entries: Record<string, unknown>): void => {
        requestStoreService.get.mockImplementation(
            (key: unknown) => entries[key as string] ?? null
        );
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceMemberGuard,
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        guard = module.get(WorkspaceMemberGuard);
    });

    it('validates the membership for the stored workspace and user and stores the member with its role', async () => {
        seed({
            [WorkspaceStoreKey]: { id: 'workspace-id' },
            [UserStoreKey]: { id: 'user-id' },
        });
        workspaceMemberDomain.validateWorkspaceMemberGuard.mockResolvedValue(
            member
        );

        await expect(guard.canActivate(context)).resolves.toBe(true);

        expect(
            workspaceMemberDomain.validateWorkspaceMemberGuard
        ).toHaveBeenCalledWith('workspace-id', 'user-id');
        expect(requestStoreService.set).toHaveBeenCalledTimes(1);
        expect(requestStoreService.set).toHaveBeenCalledWith(
            WorkspaceMemberStoreKey,
            member
        );
    });

    it('never reads or writes the request ability', async () => {
        seed({
            [WorkspaceStoreKey]: { id: 'workspace-id' },
            [UserStoreKey]: { id: 'user-id' },
        });
        workspaceMemberDomain.validateWorkspaceMemberGuard.mockResolvedValue(
            member
        );

        await guard.canActivate(context);

        expect(requestStoreService.get).not.toHaveBeenCalledWith(
            PolicyAbilityStoreKey
        );
        expect(requestStoreService.set).not.toHaveBeenCalledWith(
            PolicyAbilityStoreKey,
            expect.anything()
        );
    });

    it('passes null identifiers when prerequisite guards did not store context', async () => {
        seed({});
        workspaceMemberDomain.validateWorkspaceMemberGuard.mockResolvedValue(
            member
        );

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(
            workspaceMemberDomain.validateWorkspaceMemberGuard
        ).toHaveBeenCalledWith(null, null);
    });

    it.each([
        {
            name: 'only the workspace is stored',
            entries: { [WorkspaceStoreKey]: { id: 'workspace-id' } },
            expected: ['workspace-id', null],
        },
        {
            name: 'only the user is stored',
            entries: { [UserStoreKey]: { id: 'user-id' } },
            expected: [null, 'user-id'],
        },
    ])(
        'passes null for the missing identifier when $name',
        async ({ entries, expected }) => {
            seed(entries);
            workspaceMemberDomain.validateWorkspaceMemberGuard.mockResolvedValue(
                member
            );

            await expect(guard.canActivate(context)).resolves.toBe(true);

            expect(
                workspaceMemberDomain.validateWorkspaceMemberGuard
            ).toHaveBeenCalledWith(...expected);
        }
    );

    it('propagates the domain rejection unchanged and publishes nothing', async () => {
        const error = new Error('not a workspace member');
        seed({
            [WorkspaceStoreKey]: { id: 'workspace-id' },
            [UserStoreKey]: { id: 'user-id' },
        });
        workspaceMemberDomain.validateWorkspaceMemberGuard.mockRejectedValue(
            error
        );

        await expect(guard.canActivate(context)).rejects.toBe(error);
        expect(requestStoreService.set).not.toHaveBeenCalled();
    });
});
