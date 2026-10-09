import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumRoleScope,
    type Prisma,
    type Project,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import type { IProjectMember } from '@modules/project/interfaces/project.interface';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRoleProjectKey } from '@modules/role/enums/role.project-key.enum';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { ProjectNotFoundException } from '@modules/project/exceptions/project.not-found.exception';
import { ProjectSlugAlreadyExistsException } from '@modules/project/exceptions/project.slug-already-exists.exception';
import { ProjectSlugInvalidException } from '@modules/project/exceptions/project.slug-invalid.exception';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { ConfigService } from '@nestjs/config';

describe('ProjectDomain', () => {
    const projectRepository: MockProxy<ProjectRepository> =
        mock<ProjectRepository>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const projectMemberDomain: MockProxy<ProjectMemberDomain> =
        mock<ProjectMemberDomain>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const tx = mock<IDatabaseTransactionClient>();
    const configGet = vi.mocked(configService.get);
    const project = mock<Project>({
        id: 'project-id',
        workspaceId: 'workspace-id',
        slug: 'project-slug',
    });

    let domain: ProjectDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => {
            if (key === 'project.slugRegex') return /^[a-z-]+$/;
            if (key === 'project.slugPrefix') return 'project';
            if (key === 'project.slugMaxLength') return 20;
            if (key === 'project.slugMaxAttempts') return 2;
            return undefined;
        });
        databaseService.withTransaction.mockImplementation(async callback =>
            callback(tx)
        );
        databaseUtil.isUniqueCollision.mockReturnValue(false);
        helperStringService.generateSlug
            .mockReturnValueOnce('first-slug')
            .mockReturnValueOnce('second-slug');

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectDomain,
                { provide: ProjectRepository, useValue: projectRepository },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
                { provide: ConfigService, useValue: configService },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: ProjectMemberDomain, useValue: projectMemberDomain },
                { provide: RoleDomain, useValue: roleDomain },
            ],
        }).compile();

        domain = module.get(ProjectDomain);
    });

    it('rejects project validation without workspace or project context', async () => {
        await expect(
            domain.validateProjectGuard(null, 'project-id')
        ).rejects.toBeInstanceOf(WorkspaceNotFoundException);
        await expect(
            domain.validateProjectGuard('workspace-id', null)
        ).rejects.toBeInstanceOf(ProjectNotFoundException);
    });

    it('rejects a project outside the active workspace', async () => {
        projectRepository.findActiveByIdAndWorkspace.mockResolvedValue(null);
        await expect(
            domain.validateProjectGuard('workspace-id', 'project-id')
        ).rejects.toBeInstanceOf(ProjectNotFoundException);
        expect(
            projectRepository.findActiveByIdAndWorkspace
        ).toHaveBeenCalledWith('project-id', 'workspace-id');
    });

    describe('getListForMember', () => {
        const pagination =
            mock<IPaginationQueryCursorParams<Prisma.ProjectWhereInput>>();
        const page = mock<IResponsePaginationReturn<Project>>();

        it('forwards the policy predicate as the only access filter', async () => {
            const where: Prisma.ProjectWhereInput = {
                OR: [{ members: { some: { userId: 'user-id' } } }],
            };
            projectRepository.findWithPaginationCursorForWorkspace.mockResolvedValue(
                page
            );

            await expect(
                domain.getListForMember('workspace-id', pagination, where)
            ).resolves.toBe(page);
            expect(
                projectRepository.findWithPaginationCursorForWorkspace
            ).toHaveBeenCalledWith('workspace-id', pagination, where);
        });
    });

    describe('getListForAdmin', () => {
        it('forwards the where and the workspace filter', async () => {
            const pagination =
                mock<IPaginationQueryOffsetParams<Prisma.ProjectWhereInput>>();
            const page = mock<IResponsePaginationReturn<Project>>();
            const where: Prisma.ProjectWhereInput = {
                workspaceId: 'workspace-id',
            };
            projectRepository.findWithPaginationOffsetForAdmin.mockResolvedValue(
                page
            );

            await expect(
                domain.getListForAdmin(pagination, 'workspace-id', where)
            ).resolves.toBe(page);
            expect(
                projectRepository.findWithPaginationOffsetForAdmin
            ).toHaveBeenCalledWith(pagination, 'workspace-id', where);
        });

        it('lists for a caller that supplies no where and no workspace filter', async () => {
            const pagination =
                mock<IPaginationQueryOffsetParams<Prisma.ProjectWhereInput>>();
            const page = mock<IResponsePaginationReturn<Project>>();
            projectRepository.findWithPaginationOffsetForAdmin.mockResolvedValue(
                page
            );

            await expect(domain.getListForAdmin(pagination)).resolves.toBe(
                page
            );
            expect(
                projectRepository.findWithPaginationOffsetForAdmin
            ).toHaveBeenCalledWith(pagination, undefined, undefined);
        });
    });

    describe('createProject', () => {
        const adminRole = mock<IRole>({ id: 'admin-role-id' });

        beforeEach(() => {
            roleDomain.getByScopeAndKeyInTx.mockResolvedValue(adminRole);
            projectRepository.createInTx.mockResolvedValue(project);
            projectMemberDomain.createInTx.mockResolvedValue(
                mock<IProjectMember>()
            );
        });

        it('creates the project and its creator admin member in one transaction, then stages activity', async () => {
            await expect(
                domain.createProject('workspace-id', 'actor-id', {
                    name: 'Project',
                })
            ).resolves.toBe(project);
            expect(databaseService.withTransaction).toHaveBeenCalledOnce();
            expect(roleDomain.getByScopeAndKeyInTx).toHaveBeenCalledWith(
                tx,
                EnumRoleScope.project,
                EnumRoleProjectKey.admin
            );
            expect(projectRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'workspace-id',
                { name: 'Project' },
                'first-slug'
            );
            expect(projectMemberDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'project-id',
                'actor-id',
                'admin-role-id',
                'actor-id'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.projectCreated,
                userId: 'actor-id',
                createdBy: 'actor-id',
                workspaceId: 'workspace-id',
            });
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.projectMemberAssigned,
                userId: 'actor-id',
                createdBy: 'actor-id',
                workspaceId: 'workspace-id',
                metadata: { targetUserId: 'actor-id' },
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledOnce();
        });

        it('fails without staging activity when the admin role is missing', async () => {
            roleDomain.getByScopeAndKeyInTx.mockResolvedValue(null);
            await expect(
                domain.createProject('workspace-id', 'actor-id', {
                    name: 'Project',
                })
            ).rejects.toBeInstanceOf(RoleNotFoundException);
            expect(projectRepository.createInTx).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('retries the next slug candidate on a slug collision', async () => {
            const collision = new Error('collision');
            databaseService.withTransaction
                .mockRejectedValueOnce(collision)
                .mockImplementationOnce(async callback => callback(tx));
            databaseUtil.isUniqueCollision.mockReturnValueOnce(true);
            await expect(
                domain.createProject('workspace-id', 'actor-id', {
                    name: 'Project',
                })
            ).resolves.toBe(project);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
            expect(projectRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'workspace-id',
                { name: 'Project' },
                'second-slug'
            );
        });

        it('rethrows a non-collision failure', async () => {
            const failure = new Error('boom');
            databaseService.withTransaction.mockRejectedValue(failure);
            await expect(
                domain.createProject('workspace-id', 'actor-id', {
                    name: 'Project',
                })
            ).rejects.toBe(failure);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('fails after exhausting every slug candidate', async () => {
            databaseService.withTransaction.mockRejectedValue(
                new Error('collision')
            );
            databaseUtil.isUniqueCollision.mockReturnValue(true);
            await expect(
                domain.createProject('workspace-id', 'actor-id', {
                    name: 'Project',
                })
            ).rejects.toBeInstanceOf(
                DatabaseUniqueValueGenerationFailedException
            );
        });
    });

    it.each(['INVALID!', 'this-slug-is-far-too-long'])(
        'rejects invalid project slug %s',
        async slug => {
            await expect(
                domain.updateProjectSlug(project, 'actor-id', slug)
            ).rejects.toBeInstanceOf(ProjectSlugInvalidException);
            expect(
                projectRepository.existsBySlugInWorkspace
            ).not.toHaveBeenCalled();
        }
    );

    it('rejects an existing project slug in the workspace', async () => {
        projectRepository.existsBySlugInWorkspace.mockResolvedValue(true);
        await expect(
            domain.updateProjectSlug(project, 'actor-id', 'valid-slug')
        ).rejects.toBeInstanceOf(ProjectSlugAlreadyExistsException);
    });
});
