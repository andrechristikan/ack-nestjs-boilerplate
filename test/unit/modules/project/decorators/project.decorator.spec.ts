import { HttpStatus } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { ExecutionContext, Type } from '@nestjs/common';
import {
    getParamDecoratorFactory,
    buildDecoratorTarget,
} from '@test/unit/helpers/test.unit.decorator.helper';
import {
    ProjectContext,
    ProjectProtected,
} from '@modules/project/decorators/project.decorator';
import {
    ProjectContextStoreKey,
    ProjectProtectedDocErrors,
    ProjectRoleMetaKey,
    ProjectRoleProtectedDocErrors,
} from '@modules/project/constants/project.constant';
import {
    buildProject,
    buildProjectMember,
    expectRequestContextMissingWithKey,
} from '@test/unit/helpers/test.unit.request.helper';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger';
import { EnumProjectMemberRole } from '@generated/prisma-client/client';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumProjectStatusCodeError } from '@modules/project/enums/project.status-code.enum';
import { ProjectGuard } from '@modules/project/guards/project.guard';

describe('project.decorator', () => {
    describe('ProjectProtected', () => {
        it('mounts ProjectGuard, stores the empty roles, and documents the projectId path param', () => {
            const handler = vi.fn();
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);

            ProjectProtected()(target, propertyKey, descriptor);

            expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
                ProjectGuard,
            ]);
            expect(Reflect.getMetadata(ProjectRoleMetaKey, handler)).toEqual(
                []
            );
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

        it('documents the project not-found and workspace guard-missing errors with no roles', () => {
            const handler = vi.fn();
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);

            ProjectProtected()(target, propertyKey, descriptor);

            const entries = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                handler
            ) as IDocResponseEntry[];

            expect(entries).toEqual(ProjectProtectedDocErrors);
            expect(entries).toContainEqual({
                httpStatus: HttpStatus.NOT_FOUND,
                statusCode: EnumProjectStatusCodeError.notFound,
                messagePath: 'project.error.notFound',
            });
            expect(entries).toContainEqual({
                httpStatus: HttpStatus.FORBIDDEN,
                statusCode: EnumProjectStatusCodeError.memberForbidden,
                messagePath: 'project.error.memberForbidden',
            });
        });

        it('stores the roles and documents the role errors with roles', () => {
            const handler = vi.fn();
            const { target, propertyKey, descriptor } =
                buildDecoratorTarget(handler);

            ProjectProtected(EnumProjectMemberRole.admin)(
                target,
                propertyKey,
                descriptor
            );

            expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([
                ProjectGuard,
            ]);
            expect(Reflect.getMetadata(ProjectRoleMetaKey, handler)).toEqual([
                EnumProjectMemberRole.admin,
            ]);
            const entries = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                handler
            ) as IDocResponseEntry[];

            expect(entries).toEqual(ProjectRoleProtectedDocErrors);
            expect(entries).toContainEqual({
                httpStatus: HttpStatus.FORBIDDEN,
                statusCode: EnumProjectStatusCodeError.roleForbidden,
                messagePath: 'project.error.roleForbidden',
            });
        });
    });

    describe('ProjectContext', () => {
        const project = buildProject();
        const projectMember = buildProjectMember('user-1');
        const clsService: MockProxy<
            ReturnType<typeof ClsServiceManager.getClsService>
        > = mock<ReturnType<typeof ClsServiceManager.getClsService>>();
        const executionContext: MockProxy<ExecutionContext> =
            mock<ExecutionContext>();
        const target = {} as Type<unknown>;
        ProjectContext()(target, 'projectContext', 0);
        const factory = getParamDecoratorFactory(target, 'projectContext');

        beforeEach(() => {
            vi.resetAllMocks();
            vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(
                clsService
            );
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('throws RequestContextMissingException naming the key when the store holds none', () => {
            clsService.get.mockReturnValue(undefined);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissingWithKey(thrown, ProjectContextStoreKey);
        });

        it('throws RequestContextMissingException naming the key when the store holds no project', () => {
            clsService.get.mockReturnValue({ projectMember });

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissingWithKey(thrown, ProjectContextStoreKey);
        });

        it('returns the stored project and project member', () => {
            clsService.get.mockReturnValue({ project, projectMember });

            expect(factory(undefined, executionContext)).toEqual({
                project,
                projectMember,
            });
            expect(clsService.get).toHaveBeenCalledWith(ProjectContextStoreKey);
        });

        it('returns a null project member when no member guard wrote one', () => {
            clsService.get.mockReturnValue({ project });

            expect(factory(undefined, executionContext)).toEqual({
                project,
                projectMember: null,
            });
        });
    });
});
