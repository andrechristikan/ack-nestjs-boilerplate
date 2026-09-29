import type { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumProjectMemberRole,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { Project, ProjectMember } from '@generated/prisma-client/client';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import {
    ProjectMemberStoreKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';

function buildUser(overrides: Partial<IUser> = {}): IUser {
    return {
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
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: false,
            cookies: false,
        },
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-1',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
        ...overrides,
    };
}

describe('ProjectMemberGuard', () => {
    const projectMemberDomain = mock<ProjectMemberDomain>();
    const requestStoreService = mock<RequestStoreService>();
    let guard: ProjectMemberGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectMemberGuard,
                {
                    provide: ProjectMemberDomain,
                    useValue: projectMemberDomain,
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
        const executionContext = mock<ExecutionContext>();
        const member: ProjectMember = {
            id: '507f1f77bcf86cd799439011',
            projectId: '507f1f77bcf86cd799439012',
            userId: '507f1f77bcf86cd799439013',
            role: EnumProjectMemberRole.member,
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
            const user = buildUser();
            requestStoreService.get.mockImplementation(key => {
                if (key === ProjectStoreKey) {
                    return project;
                } else if (key === UserStoreKey) {
                    return user;
                }

                return null;
            });
            projectMemberDomain.validateProjectMemberGuard.mockResolvedValue(
                member
            );

            await expect(guard.canActivate(executionContext)).resolves.toBe(
                true
            );
            expect(
                projectMemberDomain.validateProjectMemberGuard
            ).toHaveBeenCalledWith(
                '507f1f77bcf86cd799439012',
                '507f1f77bcf86cd799439013'
            );
            expect(requestStoreService.set).toHaveBeenCalledWith(
                ProjectMemberStoreKey,
                member
            );
        });

        it('validates with a null projectId and userId when neither is stored', async () => {
            requestStoreService.get.mockReturnValue(null);
            projectMemberDomain.validateProjectMemberGuard.mockResolvedValue(
                member
            );

            await guard.canActivate(executionContext);

            expect(
                projectMemberDomain.validateProjectMemberGuard
            ).toHaveBeenCalledWith(null, null);
        });
    });
});
