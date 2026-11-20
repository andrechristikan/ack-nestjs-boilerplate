import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import { ProjectGuard } from '@modules/project/guards/project.guard';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import {
    ProjectContextStoreKey,
    ProjectRoleMetaKey,
} from '@modules/project/constants/project.constant';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { WorkspaceContextStoreKey } from '@modules/workspace/constants/workspace.constant';
import { buildHttpExecutionContext } from '@test/unit/helpers/test.unit.execution-context.helper';
import {
    buildProject,
    buildProjectMember,
    buildWorkspace,
    buildWorkspaceMember,
} from '@test/unit/helpers/test.unit.request.helper';
import { EnumWorkspaceMemberRole } from '@generated/prisma-client/client';

describe('ProjectGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    let guard: ProjectGuard;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectGuard,
                { provide: Reflector, useValue: reflector },
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        guard = module.get(ProjectGuard);
    });

    describe('canActivate', () => {
        const workspace = buildWorkspace();
        const workspaceMember = buildWorkspaceMember(
            'user-1',
            EnumWorkspaceMemberRole.member
        );
        const project = buildProject();
        const projectMember = buildProjectMember('user-1');

        it('passes the workspace member, the projectId param, and the roles metadata in one call and merges the returned context', async () => {
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.params = { projectId: 'p1' };
            const executionContext = buildHttpExecutionContext(request);
            requestStoreService.get.mockReturnValue({
                workspace,
                workspaceMember,
            });
            reflector.get.mockReturnValue([EnumProjectMemberRole.admin]);
            projectMemberService.validateProjectGuard.mockResolvedValue({
                project,
                projectMember,
            });

            await expect(guard.canActivate(executionContext)).resolves.toBe(
                true
            );
            expect(requestStoreService.get).toHaveBeenCalledWith(
                WorkspaceContextStoreKey
            );
            expect(reflector.get).toHaveBeenCalledWith(
                ProjectRoleMetaKey,
                executionContext.getHandler()
            );
            expect(
                projectMemberService.validateProjectGuard
            ).toHaveBeenCalledTimes(1);
            expect(
                projectMemberService.validateProjectGuard
            ).toHaveBeenCalledWith(workspaceMember, 'p1', [
                EnumProjectMemberRole.admin,
            ]);
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                ProjectContextStoreKey,
                { project, projectMember }
            );
        });

        it('passes a null projectId and an empty role list when the route carries neither', async () => {
            const request: MockProxy<IRequestApp> = mock<IRequestApp>();
            request.params = {};
            requestStoreService.get.mockReturnValue({
                workspace,
                workspaceMember,
            });
            reflector.get.mockReturnValue(undefined);
            projectMemberService.validateProjectGuard.mockResolvedValue({
                project,
                projectMember: null,
            });

            await guard.canActivate(buildHttpExecutionContext(request));

            expect(
                projectMemberService.validateProjectGuard
            ).toHaveBeenCalledWith(workspaceMember, null, []);
        });

        it.each([
            ['no context', null],
            ['no workspace', { workspaceMember }],
            ['no workspace member', { workspace }],
        ])(
            'throws WorkspaceGuardMissingException before the domain call with %s',
            async (_name, workspaceContext) => {
                const request: MockProxy<IRequestApp> = mock<IRequestApp>();
                request.params = { projectId: 'p1' };
                requestStoreService.get.mockReturnValue(workspaceContext);

                await expect(
                    guard.canActivate(buildHttpExecutionContext(request))
                ).rejects.toMatchObject({
                    module: 'workspace',
                    statusCode: EnumWorkspaceStatusCodeError.guardMissing,
                });
                expect(
                    projectMemberService.validateProjectGuard
                ).not.toHaveBeenCalled();
            }
        );
    });
});
