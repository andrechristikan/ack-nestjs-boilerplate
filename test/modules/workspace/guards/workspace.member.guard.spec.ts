import { createMock } from '@golevelup/ts-vitest';
import type { ExecutionContext } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestStoreService } from '@common/request/services/request.store.service';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import {
    WorkspaceMemberStoreKey,
    WorkspaceStoreKey,
} from '@modules/workspace/constants/workspace.constant';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceMemberGuard } from '@modules/workspace/guards/workspace.member.guard';

describe('WorkspaceMemberGuard', () => {
    const workspaceMemberDomain = createMock<WorkspaceMemberDomain>();
    const requestStoreService = createMock<RequestStoreService>();
    const context = createMock<ExecutionContext>();

    beforeEach(() => vi.resetAllMocks());

    it('validates and stores the current membership', async () => {
        const workspace = { id: 'workspace-id' };
        const user = { id: 'user-id' };
        const member =
            createMock<
                Awaited<
                    ReturnType<
                        WorkspaceMemberDomain['validateWorkspaceMemberGuard']
                    >
                >
            >();
        requestStoreService.get.mockImplementation(key => {
            if (key === WorkspaceStoreKey) return workspace;
            if (key === UserStoreKey) return user;
            return undefined;
        });
        workspaceMemberDomain.validateWorkspaceMemberGuard.mockResolvedValue(
            member
        );
        const guard = new WorkspaceMemberGuard(
            workspaceMemberDomain,
            requestStoreService
        );

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(
            workspaceMemberDomain.validateWorkspaceMemberGuard
        ).toHaveBeenCalledWith('workspace-id', 'user-id');
        expect(requestStoreService.set).toHaveBeenCalledWith(
            WorkspaceMemberStoreKey,
            member
        );
    });

    it('passes null identifiers when prerequisite guards did not store context', async () => {
        const member =
            createMock<
                Awaited<
                    ReturnType<
                        WorkspaceMemberDomain['validateWorkspaceMemberGuard']
                    >
                >
            >();
        requestStoreService.get.mockReturnValue(undefined);
        workspaceMemberDomain.validateWorkspaceMemberGuard.mockResolvedValue(
            member
        );
        const guard = new WorkspaceMemberGuard(
            workspaceMemberDomain,
            requestStoreService
        );

        await guard.canActivate(context);
        expect(
            workspaceMemberDomain.validateWorkspaceMemberGuard
        ).toHaveBeenCalledWith(null, null);
    });
});
