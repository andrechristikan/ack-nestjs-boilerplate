import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger';
import type { Project, ProjectMember } from '@generated/prisma-client/client';
import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import { ClsServiceManager } from 'nestjs-cls';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
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

function buildDescriptor(): {
    target: object;
    propertyKey: string;
    descriptor: PropertyDescriptor;
    handler: () => void;
} {
    function handler(): void {}

    return {
        target: {},
        propertyKey: 'handler',
        descriptor: {
            value: handler,
            writable: true,
            enumerable: false,
            configurable: true,
        },
        handler,
    };
}

function extractParamFactory<TData, TResult>(
    decorate: (target: object, key: string, index: number) => void,
    key: string
): (data: TData | undefined) => TResult {
    const target = {};
    decorate(target, key, 0);

    const args = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        (target as { constructor: object }).constructor,
        key
    ) as Record<string, { factory: (data: TData | undefined) => TResult }>;

    return Object.values(args)[0].factory;
}

describe('ProjectProtected', () => {
    it('mounts ProjectGuard and documents the projectId path param', () => {
        const { target, propertyKey, descriptor, handler } = buildDescriptor();

        ProjectProtected()(target, propertyKey, descriptor);

        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
            ProjectGuard,
        ]);
        expect(Reflect.getMetadata(DECORATORS.API_PARAMETERS, handler)).toEqual(
            [
                expect.objectContaining({
                    name: 'projectId',
                    required: true,
                    type: 'string',
                }),
            ]
        );
    });

    it('documents the workspace and project not-found errors at 404', () => {
        const { target, propertyKey, descriptor, handler } = buildDescriptor();

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
        const factory = extractParamFactory<
            Extract<keyof Project, string> | undefined,
            Project
        >(ProjectCurrent(), 'returnsWholeProject');

        const result = factory(undefined);

        expect(result).toBe(project);
        expect(getMock).toHaveBeenCalledWith(ProjectStoreKey);
    });

    it('returns the requested field of the stored project', () => {
        vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue({
            get: vi.fn().mockReturnValue(project),
        } as never);
        const factory = extractParamFactory<
            Extract<keyof Project, string> | undefined,
            Project
        >(ProjectCurrent('slug'), 'returnsField');

        const result = factory('slug');

        expect(result).toBe('website-revamp');
    });

    it('throws RequestContextMissingException when no project is stored', () => {
        vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue({
            get: vi.fn().mockReturnValue(undefined),
        } as never);
        const factory = extractParamFactory<
            Extract<keyof Project, string> | undefined,
            Project
        >(ProjectCurrent(), 'throwsWhenMissing');

        let thrown: unknown;
        try {
            factory(undefined);
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(RequestContextMissingException);
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
                    'RequestContextMissingException: no value for "ProjectStore"',
            }),
        });
    });

    it('throws RequestContextMissingException when the requested field is absent', () => {
        vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue({
            get: vi.fn().mockReturnValue(project),
        } as never);
        const factory = extractParamFactory<
            Extract<keyof Project, string> | undefined,
            Project
        >(ProjectCurrent('description'), 'throwsWhenFieldMissing');

        let thrown: unknown;
        try {
            factory('description');
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(RequestContextMissingException);
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
                    'RequestContextMissingException: no value for "ProjectStore.description"',
            }),
        });
    });
});

describe('ProjectMemberProtected', () => {
    it('with no roles: mounts ProjectMemberGuard and documents member not-found/forbidden', () => {
        const { target, propertyKey, descriptor, handler } = buildDescriptor();

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

    it('with roles: mounts ProjectRoleGuard, stores the roles, and documents role not-found/forbidden', () => {
        const { target, propertyKey, descriptor, handler } = buildDescriptor();

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
        const factory = extractParamFactory<
            Extract<keyof ProjectMember, string> | undefined,
            ProjectMember
        >(ProjectMemberCurrent(), 'returnsWholeMember');

        const result = factory(undefined);

        expect(result).toBe(projectMember);
        expect(getMock).toHaveBeenCalledWith(ProjectMemberStoreKey);
    });

    it('returns the requested field of the stored project member', () => {
        vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue({
            get: vi.fn().mockReturnValue(projectMember),
        } as never);
        const factory = extractParamFactory<
            Extract<keyof ProjectMember, string> | undefined,
            ProjectMember
        >(ProjectMemberCurrent('role'), 'returnsMemberField');

        const result = factory('role');

        expect(result).toBe(EnumProjectMemberRole.member);
    });

    it('throws RequestContextMissingException when no project member is stored', () => {
        vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue({
            get: vi.fn().mockReturnValue(undefined),
        } as never);
        const factory = extractParamFactory<
            Extract<keyof ProjectMember, string> | undefined,
            ProjectMember
        >(ProjectMemberCurrent(), 'throwsWhenMemberMissing');

        let thrown: unknown;
        try {
            factory(undefined);
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(RequestContextMissingException);
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
                    'RequestContextMissingException: no value for "ProjectMemberStore"',
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
        const factory = extractParamFactory<
            Extract<keyof ProjectMember, string> | undefined,
            ProjectMember
        >(ProjectMemberCurrent('joinedAt'), 'throwsWhenMemberFieldMissing');

        let thrown: unknown;
        try {
            factory('joinedAt');
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(RequestContextMissingException);
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
                    'RequestContextMissingException: no value for "ProjectMemberStore.joinedAt"',
            }),
        });
    });
});
