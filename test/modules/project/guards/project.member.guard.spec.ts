import { createMock } from '@golevelup/ts-vitest';
import type { ExecutionContext } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    ProjectMemberStoreKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import { UserStoreKey } from '@modules/user/constants/user.constant';

describe('ProjectMemberGuard', () => {
    const projectMemberDomain = createMock<ProjectMemberDomain>();
    const requestStoreService = createMock<RequestStoreService>();
    const context = createMock<ExecutionContext>();

    beforeEach(() => vi.resetAllMocks());

    it('validates and stores the current project membership', async () => {
        const member =
            createMock<
                Awaited<
                    ReturnType<
                        ProjectMemberDomain['validateProjectMemberGuard']
                    >
                >
            >();
        requestStoreService.get.mockImplementation(key => {
            if (key === ProjectStoreKey) return { id: 'project-id' };
            if (key === UserStoreKey) return { id: 'user-id' };
            return undefined;
        });
        projectMemberDomain.validateProjectMemberGuard.mockResolvedValue(
            member
        );
        const guard = new ProjectMemberGuard(
            projectMemberDomain,
            requestStoreService
        );

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(
            projectMemberDomain.validateProjectMemberGuard
        ).toHaveBeenCalledWith('project-id', 'user-id');
        expect(requestStoreService.set).toHaveBeenCalledWith(
            ProjectMemberStoreKey,
            member
        );
    });
});
