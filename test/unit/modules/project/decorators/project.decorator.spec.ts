import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger';
import type { Project, ProjectMember } from '@generated/prisma-client/client';
import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import { ClsServiceManager } from 'nestjs-cls';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import {
    ProjectMemberStoreKey,
    ProjectRoleMetaKey,
    ProjectStoreKey,
} from '@modules/project/constants/project.constant';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { ProjectGuard } from '@modules/project/guards/project.guard';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import { ProjectRoleGuard } from '@modules/project/guards/project.role.guard';
import {
    ProjectCurrent,
    ProjectMemberCurrent,
    ProjectMemberProtected,
    ProjectProtected,
} from '@modules/project/decorators/project.decorator';
import {
    buildDecoratorTarget,
    getParamDecoratorFactory,
} from '@test/unit/helpers/test.unit.decorator.helper';

describe('project.decorator', () => {
    describe('ProjectProtected', () => {
        it('mounts ProjectGuard and documents the projectId path param', () => {
            const handler = vi.fn();
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);

            ProjectProtected()(target, propertyKey, descriptor);

            expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
                ProjectGuard,
            ]);
            expect(
                Reflect.getMetadata(DECORATORS.API_PARAMETERS, handler)
            ).toEqual([
                expect.objectContaining({
                    name: 'projectId',
                    required: true,
                    type: 'string',
                }),
            ]);
        });

        it('documents the workspace and project not-found errors at 404', () => {
            const handler = vi.fn();
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);

            ProjectProtected()(target, propertyKey, descriptor);

            const entries = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                handler
            ) as IDocResponseEntry[];

            expect(entries).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        httpStatus: HttpStatus.NOT_FOUND,
                        statusCode: EnumWorkspaceStatusCodeError.notFound,
                        messagePath: 'workspace.error.notFound',
                    }),
                    expect.objectContaining({
                        httpStatus: HttpStatus.NOT_FOUND,
                        statusCode: EnumProjectStatusCodeError.notFound,
                        messagePath: 'project.error.notFound',
                    }),
                ])
            );
        });
    });

    describe('ProjectCurrent', () => {
        const project: Project = {
            id: '507f1f77bcf86cd799439011',
            workspaceId: '507f1f77bcf86cd799439012',
            name: 'Website Revamp',
            slug: 'website-revamp',
            description: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
        };

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('returns the whole stored project with no field', () => {
            const getMock = vi.fn().mockReturnValue(project);
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue({
                get: getMock,
            } as never);
            const target = {};
            ProjectCurrent()(target, 'returnsWholeProject', 0);
            const factory = getParamDecoratorFactory(
                target,
                'returnsWholeProject'
            );

            const result = factory(undefined);

            expect(result).toBe(project);
            expect(getMock).toHaveBeenCalledWith(ProjectStoreKey);
        });

        it('returns the requested field of the stored project', () => {
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue({
                get: vi.fn().mockReturnValue(project),
            } as never);
            const target = {};
            ProjectCurrent('slug')(target, 'returnsField', 0);
            const factory = getParamDecoratorFactory(target, 'returnsField');

            const result = factory('slug');

            expect(result).toBe('website-revamp');
        });

        it('throws RequestContextMissingException when no project is stored', () => {
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue({
                get: vi.fn().mockReturnValue(undefined),
            } as never);
            const target = {};
            ProjectCurrent()(target, 'throwsWhenMissing', 0);
            const factory = getParamDecoratorFactory(
                target,
                'throwsWhenMissing'
            );

            let thrown: unknown;
            try {
                factory(undefined);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.contextMissing
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'request.error.contextMissing',
                rawError: expect.objectContaining({
                    message:
                        'RequestContextMissingException: no value for "ProjectStoreKey"',
                }),
            });
        });

        it('throws RequestContextMissingException when the requested field is absent', () => {
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue({
                get: vi.fn().mockReturnValue(project),
            } as never);
            const target = {};
            ProjectCurrent('description')(target, 'throwsWhenFieldMissing', 0);
            const factory = getParamDecoratorFactory(
                target,
                'throwsWhenFieldMissing'
            );

            let thrown: unknown;
            try {
                factory('description');
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.contextMissing
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'request.error.contextMissing',
                rawError: expect.objectContaining({
                    message:
                        'RequestContextMissingException: no value for "ProjectStoreKey.description"',
                }),
            });
        });
    });

    describe('ProjectMemberProtected', () => {
        it('mounts ProjectMemberGuard with no roles and documents member not-found/forbidden', () => {
            const handler = vi.fn();
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);

            ProjectMemberProtected()(target, propertyKey, descriptor);

            expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
                ProjectMemberGuard,
            ]);
            expect(
                Reflect.getMetadata(ProjectRoleMetaKey, handler)
            ).toBeUndefined();

            const entries = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                handler
            ) as IDocResponseEntry[];

            expect(entries).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        httpStatus: HttpStatus.NOT_FOUND,
                        statusCode: EnumProjectStatusCodeError.notFound,
                        messagePath: 'project.error.notFound',
                    }),
                    expect.objectContaining({
                        httpStatus: HttpStatus.FORBIDDEN,
                        statusCode: EnumProjectStatusCodeError.memberForbidden,
                        messagePath: 'project.error.memberForbidden',
                    }),
                ])
            );
        });

        it('mounts ProjectRoleGuard with roles, stores the roles, and documents role not-found/forbidden', () => {
            const handler = vi.fn();
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);

            ProjectMemberProtected(EnumProjectMemberRole.admin)(
                target,
                propertyKey,
                descriptor
            );

            expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
                ProjectRoleGuard,
            ]);
            expect(Reflect.getMetadata(ProjectRoleMetaKey, handler)).toEqual([
                EnumProjectMemberRole.admin,
            ]);

            const entries = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                handler
            ) as IDocResponseEntry[];

            expect(entries).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        httpStatus: HttpStatus.NOT_FOUND,
                        statusCode: EnumProjectStatusCodeError.notFound,
                        messagePath: 'project.error.notFound',
                    }),
                    expect.objectContaining({
                        httpStatus: HttpStatus.FORBIDDEN,
                        statusCode: EnumProjectStatusCodeError.roleForbidden,
                        messagePath: 'project.error.roleForbidden',
                    }),
                ])
            );
        });
    });

    describe('ProjectMemberCurrent', () => {
        const projectMember: ProjectMember = {
            id: '507f1f77bcf86cd799439021',
            projectId: '507f1f77bcf86cd799439011',
            userId: '507f1f77bcf86cd799439022',
            role: EnumProjectMemberRole.member,
            joinedAt: new Date('2026-01-01T00:00:00.000Z'),
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
        };

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('returns the whole stored project member with no field', () => {
            const getMock = vi.fn().mockReturnValue(projectMember);
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue({
                get: getMock,
            } as never);
            const target = {};
            ProjectMemberCurrent()(target, 'returnsWholeMember', 0);
            const factory = getParamDecoratorFactory(
                target,
                'returnsWholeMember'
            );

            const result = factory(undefined);

            expect(result).toBe(projectMember);
            expect(getMock).toHaveBeenCalledWith(ProjectMemberStoreKey);
        });

        it('returns the requested field of the stored project member', () => {
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue({
                get: vi.fn().mockReturnValue(projectMember),
            } as never);
            const target = {};
            ProjectMemberCurrent('role')(target, 'returnsMemberField', 0);
            const factory = getParamDecoratorFactory(
                target,
                'returnsMemberField'
            );

            const result = factory('role');

            expect(result).toBe(EnumProjectMemberRole.member);
        });

        it('throws RequestContextMissingException when no project member is stored', () => {
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue({
                get: vi.fn().mockReturnValue(undefined),
            } as never);
            const target = {};
            ProjectMemberCurrent()(target, 'throwsWhenMemberMissing', 0);
            const factory = getParamDecoratorFactory(
                target,
                'throwsWhenMemberMissing'
            );

            let thrown: unknown;
            try {
                factory(undefined);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.contextMissing
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'request.error.contextMissing',
                rawError: expect.objectContaining({
                    message:
                        'RequestContextMissingException: no value for "ProjectMemberStoreKey"',
                }),
            });
        });

        it('throws RequestContextMissingException when the requested field is absent', () => {
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue({
                get: vi.fn().mockReturnValue({
                    ...projectMember,
                    joinedAt: undefined,
                }),
            } as never);
            const target = {};
            ProjectMemberCurrent('joinedAt')(
                target,
                'throwsWhenMemberFieldMissing',
                0
            );
            const factory = getParamDecoratorFactory(
                target,
                'throwsWhenMemberFieldMissing'
            );

            let thrown: unknown;
            try {
                factory('joinedAt');
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                statusCodeKey:
                    EnumRequestStatusCodeError[
                        EnumRequestStatusCodeError.contextMissing
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'request.error.contextMissing',
                rawError: expect.objectContaining({
                    message:
                        'RequestContextMissingException: no value for "ProjectMemberStoreKey.joinedAt"',
                }),
            });
        });
    });
});
