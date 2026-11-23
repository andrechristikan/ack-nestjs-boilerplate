import type { IProjectMemberWithRole } from '@modules/project/interfaces/project.interface';
import { UserContextStoreKey } from '@modules/user/constants/user.constant';
import { ProjectContextStoreKey } from '@modules/project/constants/project.constant';
import { HttpStatus } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import type { IUser } from '@modules/user/interfaces/user.interface';

import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import { buildUserContext } from '@test/unit/helpers/test.unit.request.helper';

describe('ProjectMemberGuard', () => {
    const user: IUser = {
        id: '507f1f77bcf86cd799439013',
        name: 'Jane Doe',
        username: 'jane',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'jane@example.com',
        roleId: 'role-1',
        password: 'hashed-password',
        passwordExpired: null,
        passwordCreated: null,
        passwordAttempt: 0,
        passwordLockedUntil: null,
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
        role: {
            id: 'role-1',
            scope: EnumRoleScope.platform,
            key: 'user',
            name: 'user',
            policyRevision: 0,
        },
    };

    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    let guard: ProjectMemberGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectMemberGuard,
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
        guard = module.get(ProjectMemberGuard);
    });

    describe('canActivate', () => {
        const executionContext: MockProxy<ExecutionContext> =
            mock<ExecutionContext>();
        const member: IProjectMemberWithRole = {
            id: '507f1f77bcf86cd799439011',
            projectId: '507f1f77bcf86cd799439012',
            userId: '507f1f77bcf86cd799439013',
            roleId: 'role-project-member',
            role: {
                id: 'role-project-member',
                scope: EnumRoleScope.project,
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

        it('validates and stores the project member resolved for the stored project and user', async () => {
            const project: Project = {
                id: '507f1f77bcf86cd799439012',
                workspaceId: '507f1f77bcf86cd799439014',
                name: 'Website Revamp',
                slug: 'p-abc123',
                description: null,
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: null,
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedBy: null,
                deletedAt: null,
                deletedBy: null,
            };
            const store: Record<string, unknown> = {
                [UserContextStoreKey]: buildUserContext(user),
                [ProjectContextStoreKey]: { project },
            };
            requestStoreService.get.mockImplementation(
                key => store[key] ?? null
            );
            projectMemberService.getMemberOrNull.mockResolvedValue(member);

            await expect(guard.canActivate(executionContext)).resolves.toBe(
                true
            );
            expect(projectMemberService.getMemberOrNull).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439012',
                '507f1f77bcf86cd799439013'
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                ProjectContextStoreKey,
                { projectMember: member }
            );
        });

        it('stores a null member when the caller has no row in the project', async () => {
            const store: Record<string, unknown> = {
                [UserContextStoreKey]: buildUserContext(user),
                [ProjectContextStoreKey]: { project: { id: 'project-1' } },
            };
            requestStoreService.get.mockImplementation(
                key => store[key] ?? null
            );
            projectMemberService.getMemberOrNull.mockResolvedValue(null);

            await expect(guard.canActivate(executionContext)).resolves.toBe(
                true
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                ProjectContextStoreKey,
                { projectMember: null }
            );
        });

        it('throws UserGuardMissingException before the domain call when the store holds no user context', async () => {
            requestStoreService.get.mockReturnValue(null);

            await expect(
                guard.canActivate(executionContext)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.guardMissing,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.guardMissing
                    ],
                messagePath: 'user.error.guardMissing',
                httpStatus: HttpStatus.UNAUTHORIZED,
            });
            expect(projectMemberService.getMemberOrNull).not.toHaveBeenCalled();
        });

        it('throws ProjectGuardMissingException before the domain call when the store holds no project', async () => {
            requestStoreService.get.mockImplementation(key =>
                key === UserContextStoreKey ? buildUserContext(user) : null
            );

            await expect(
                guard.canActivate(executionContext)
            ).rejects.toMatchObject({
                module: 'project',
                statusCode: EnumProjectStatusCodeError.guardMissing,
                statusCodeKey:
                    EnumProjectStatusCodeError[
                        EnumProjectStatusCodeError.guardMissing
                    ],
                messagePath: 'project.error.guardMissing',
                httpStatus: HttpStatus.FORBIDDEN,
            });
            expect(projectMemberService.getMemberOrNull).not.toHaveBeenCalled();
        });
    });
});
