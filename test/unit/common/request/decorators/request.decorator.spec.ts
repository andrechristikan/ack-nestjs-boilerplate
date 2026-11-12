import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { ExecutionContext, Type } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import {
    RequestCustomTimeoutMetaKey,
    RequestCustomTimeoutValueMetaKey,
    RequestEnvMetaKey,
    RequestLanguageStoreKey,
    RequestLogStoreKey,
    RequestProjectMemberStoreKey,
    RequestProjectStoreKey,
    RequestThrottleOptionsMetaKey,
    RequestUserStoreKey,
    RequestWorkspaceMemberStoreKey,
    RequestWorkspaceStoreKey,
} from '@common/request/constants/request.constant';
import {
    RequestEnvProtected,
    RequestGeoLocation,
    RequestIPAddress,
    RequestLanguageCurrent,
    RequestThrottle,
    RequestTimeout,
    RequestUserAgent,
} from '@common/request/decorators/request.decorator';
import { RequestEnvGuard } from '@common/request/guards/request.env.guard';
import { RequestThrottleUserGuard } from '@common/request/guards/request.throttle-user.guard';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { EnumRequestContextScope } from '@common/request/enums/request.enum';
import type { IUser } from '@modules/user/interfaces/user.interface';
import type {
    GeoLocation,
    Project,
    ProjectMember,
    UserAgent,
    Workspace,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces/index';
import {
    buildContextFactory,
    getParamDecoratorFactory,
} from '@test/unit/helpers/test.unit.decorator.helper';
import {
    expectRequestContextMissing,
    expectRequestContextMissingWithKey,
    stubRequestStore,
} from '@test/unit/helpers/test.unit.request.helper';
import { RequestEnvProtectedEmptyException } from '@common/request/exceptions/request.env-protected-empty.exception';
import { HttpStatus } from '@nestjs/common';
import { DocResponseEntryMetaKey } from '@common/doc/constants/doc.constant';
import type { IDocResponseEntry } from '@common/doc/interfaces/doc.interface';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';

describe('request.decorator', () => {
    describe('RequestTimeout', () => {
        it('sets the custom-timeout flag and value on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            RequestTimeout('5s')(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(
                    RequestCustomTimeoutMetaKey,
                    descriptor.value
                )
            ).toBe(true);
            expect(
                Reflect.getMetadata(
                    RequestCustomTimeoutValueMetaKey,
                    descriptor.value
                )
            ).toBe('5s');
        });
    });

    describe('RequestEnvProtected', () => {
        it('mounts RequestEnvGuard and the allowed environments on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            RequestEnvProtected(
                EnumAppEnvironment.local,
                EnumAppEnvironment.development
            )(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([RequestEnvGuard]);
            expect(
                Reflect.getMetadata(RequestEnvMetaKey, descriptor.value)
            ).toEqual([
                EnumAppEnvironment.local,
                EnumAppEnvironment.development,
            ]);
        });

        it('documents the RequestEnvGuard not-allowed error', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };

            RequestEnvProtected(EnumAppEnvironment.local)(
                target,
                'method',
                descriptor
            );

            const stored = Reflect.getMetadata(
                DocResponseEntryMetaKey,
                descriptor.value
            ) as IDocResponseEntry[];
            expect(stored).toEqual([
                {
                    httpStatus: HttpStatus.NOT_FOUND,
                    statusCode: EnumRequestStatusCodeError.envNotAllowed,
                    messagePath: 'http.clientError.notFound',
                },
            ]);
        });

        it('throws at evaluation when no environment is given', () => {
            expect(() => RequestEnvProtected()).toThrow(
                RequestEnvProtectedEmptyException
            );
            expect(() => RequestEnvProtected()).toThrow(
                'RequestEnvProtected needs at least one environment'
            );
        });
    });

    describe('RequestThrottle', () => {
        it('sets the throttle options and mounts RequestThrottleUserGuard on the handler', () => {
            const target = {} as Type<unknown>;
            const descriptor: PropertyDescriptor = { value: vi.fn() };
            const options = { user: true };

            RequestThrottle(options)(target, 'method', descriptor);

            expect(
                Reflect.getMetadata(
                    RequestThrottleOptionsMetaKey,
                    descriptor.value
                )
            ).toBe(options);
            expect(
                Reflect.getMetadata(GUARDS_METADATA, descriptor.value)
            ).toEqual([RequestThrottleUserGuard]);
        });
    });

    const clsService: MockProxy<
        ReturnType<typeof ClsServiceManager.getClsService>
    > = mock<ReturnType<typeof ClsServiceManager.getClsService>>();
    const executionContext: MockProxy<ExecutionContext> =
        mock<ExecutionContext>();

    const defaultUserAgent: UserAgent = {
        ua: null,
        browser: null,
        cpu: null,
        device: null,
        engine: null,
        os: null,
    };
    const defaultGeoLocation: GeoLocation = {
        latitude: 1,
        longitude: 2,
        country: 'US',
        region: 'CA',
        city: 'SF',
    };

    beforeEach(() => {
        vi.resetAllMocks();
        vi.spyOn(ClsServiceManager, 'getClsService').mockReturnValue(
            clsService
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('RequestIPAddress', () => {
        const target = {} as Type<unknown>;
        RequestIPAddress()(target, 'ipAddress', 0);
        const factory = getParamDecoratorFactory(target, 'ipAddress');

        it('throws RequestContextMissingException when the request-log store is undefined', () => {
            clsService.get.mockReturnValue(undefined);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissing(thrown);
        });

        it('throws RequestContextMissingException when the request-log store is null', () => {
            clsService.get.mockReturnValue(null);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissing(thrown);
        });

        it('throws RequestContextMissingException when ipAddress is undefined', () => {
            clsService.get.mockReturnValue({
                ipAddress: undefined,
            } as unknown as IRequestLog);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissing(thrown);
        });

        it('throws RequestContextMissingException when ipAddress is null', () => {
            const requestLog: IRequestLog = {
                userAgent: defaultUserAgent,
                ipAddress: null,
                geoLocation: defaultGeoLocation,
            };
            clsService.get.mockReturnValue(requestLog);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissing(thrown);
        });

        it('returns the resolved ip address', () => {
            const requestLog: IRequestLog = {
                userAgent: defaultUserAgent,
                ipAddress: '127.0.0.1',
                geoLocation: defaultGeoLocation,
            };
            clsService.get.mockReturnValue(requestLog);

            expect(factory(undefined, executionContext)).toBe('127.0.0.1');
        });
    });

    describe('RequestUserAgent', () => {
        const target = {} as Type<unknown>;
        RequestUserAgent()(target, 'userAgent', 0);
        const factory = getParamDecoratorFactory(target, 'userAgent');
        const userAgent: UserAgent = {
            ua: 'ua',
            browser: null,
            cpu: null,
            device: null,
            engine: null,
            os: null,
        };

        it('throws RequestContextMissingException when the request-log store is undefined', () => {
            clsService.get.mockReturnValue(undefined);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissing(thrown);
        });

        it('throws RequestContextMissingException when the request-log store is null', () => {
            clsService.get.mockReturnValue(null);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissing(thrown);
        });

        it('throws RequestContextMissingException when userAgent is undefined', () => {
            clsService.get.mockReturnValue({
                userAgent: undefined,
            } as unknown as IRequestLog);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissing(thrown);
        });

        it('throws RequestContextMissingException when userAgent is null', () => {
            const requestLog: IRequestLog = {
                userAgent: null as unknown as UserAgent,
                ipAddress: '127.0.0.1',
                geoLocation: defaultGeoLocation,
            };
            clsService.get.mockReturnValue(requestLog);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissing(thrown);
        });

        it('returns the resolved user agent', () => {
            const requestLog: IRequestLog = {
                userAgent,
                ipAddress: '127.0.0.1',
                geoLocation: defaultGeoLocation,
            };
            clsService.get.mockReturnValue(requestLog);

            expect(factory(undefined, executionContext)).toBe(userAgent);
        });
    });

    describe('RequestGeoLocation', () => {
        const target = {} as Type<unknown>;
        RequestGeoLocation()(target, 'geoLocation', 0);
        const factory = getParamDecoratorFactory(target, 'geoLocation');
        const geoLocation: GeoLocation = {
            latitude: 1,
            longitude: 2,
            country: 'US',
            region: 'CA',
            city: 'SF',
        };

        it('throws RequestContextMissingException when the request-log store is undefined', () => {
            clsService.get.mockReturnValue(undefined);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissing(thrown);
        });

        it('throws RequestContextMissingException when the request-log store is null', () => {
            clsService.get.mockReturnValue(null);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissing(thrown);
        });

        it('throws RequestContextMissingException when geoLocation is undefined', () => {
            clsService.get.mockReturnValue({
                geoLocation: undefined,
            } as unknown as IRequestLog);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissing(thrown);
        });

        it('throws RequestContextMissingException when geoLocation is null', () => {
            const requestLog: IRequestLog = {
                userAgent: defaultUserAgent,
                ipAddress: '127.0.0.1',
                geoLocation: null,
            };
            clsService.get.mockReturnValue(requestLog);

            let thrown: unknown;
            try {
                factory(undefined, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissing(thrown);
        });

        it('returns the resolved geo-location', () => {
            const requestLog: IRequestLog = {
                userAgent: defaultUserAgent,
                ipAddress: '127.0.0.1',
                geoLocation,
            };
            clsService.get.mockReturnValue(requestLog);

            expect(factory(undefined, executionContext)).toBe(geoLocation);
        });
    });

    describe('RequestContextCurrent', () => {
        const requestLog: IRequestLog = {
            userAgent: defaultUserAgent,
            ipAddress: '127.0.0.1',
            geoLocation: defaultGeoLocation,
        };
        const user = { id: 'user-1' } as IUser;
        const workspace = { id: 'workspace-1' } as Workspace;
        const workspaceMember = { id: 'member-1' } as WorkspaceMember;
        const project = { id: 'project-1' } as Project;
        const projectMember = { id: 'project-member-1' } as ProjectMember;
        const session = {
            sessionId: 'session-1',
            deviceOwnershipId: 'device-1',
        };
        const fullStore = {
            [RequestLogStoreKey]: requestLog,
            [RequestUserStoreKey]: user,
            [RequestWorkspaceStoreKey]: workspace,
            [RequestWorkspaceMemberStoreKey]: workspaceMember,
            [RequestProjectStoreKey]: project,
            [RequestProjectMemberStoreKey]: projectMember,
        };

        const factories: Record<
            EnumRequestContextScope,
            (data: unknown, ctx?: ExecutionContext) => unknown
        > = {
            public: buildContextFactory(EnumRequestContextScope.public),
            user: buildContextFactory(EnumRequestContextScope.user),
            workspace: buildContextFactory(EnumRequestContextScope.workspace),
            project: buildContextFactory(EnumRequestContextScope.project),
            projectMember: buildContextFactory(
                EnumRequestContextScope.projectMember
            ),
        };
        const httpArgumentsHost: MockProxy<HttpArgumentsHost> =
            mock<HttpArgumentsHost>();

        beforeEach(() => {
            executionContext.switchToHttp.mockReturnValue(httpArgumentsHost);
            httpArgumentsHost.getRequest.mockReturnValue({ user: session });
        });

        it('returns the log, user, session, workspace, member, and snapshot for the workspace scope', () => {
            stubRequestStore(clsService, fullStore);

            expect(
                factories.workspace(
                    EnumRequestContextScope.workspace,
                    executionContext
                )
            ).toEqual({
                requestLog,
                user,
                session,
                workspace,
                workspaceMember,
                snapshot: {
                    actorUserId: 'user-1',
                    workspaceId: 'workspace-1',
                    requestLog,
                },
            });
        });

        it('returns a null-actor, null-workspace snapshot for the public scope', () => {
            stubRequestStore(clsService, fullStore);

            expect(
                factories.public(
                    EnumRequestContextScope.public,
                    executionContext
                )
            ).toEqual({
                requestLog,
                snapshot: {
                    actorUserId: null,
                    workspaceId: null,
                    requestLog,
                },
            });
        });

        it('returns the user and a null-workspace snapshot for the user scope', () => {
            stubRequestStore(clsService, fullStore);

            expect(
                factories.user(EnumRequestContextScope.user, executionContext)
            ).toEqual({
                requestLog,
                user,
                session,
                snapshot: {
                    actorUserId: 'user-1',
                    workspaceId: null,
                    requestLog,
                },
            });
        });

        it('adds the project for the project scope', () => {
            stubRequestStore(clsService, fullStore);

            expect(
                factories.project(
                    EnumRequestContextScope.project,
                    executionContext
                )
            ).toEqual({
                requestLog,
                user,
                session,
                workspace,
                workspaceMember,
                project,
                snapshot: {
                    actorUserId: 'user-1',
                    workspaceId: 'workspace-1',
                    requestLog,
                },
            });
        });

        it('adds the project member for the projectMember scope', () => {
            stubRequestStore(clsService, fullStore);

            expect(
                factories.projectMember(
                    EnumRequestContextScope.projectMember,
                    executionContext
                )
            ).toEqual({
                requestLog,
                user,
                session,
                workspace,
                workspaceMember,
                project,
                projectMember,
                snapshot: {
                    actorUserId: 'user-1',
                    workspaceId: 'workspace-1',
                    requestLog,
                },
            });
        });

        it.each([
            [EnumRequestContextScope.public, RequestLogStoreKey],
            [EnumRequestContextScope.user, RequestUserStoreKey],
            [EnumRequestContextScope.workspace, RequestWorkspaceStoreKey],
            [EnumRequestContextScope.workspace, RequestWorkspaceMemberStoreKey],
            [EnumRequestContextScope.project, RequestProjectStoreKey],
            [
                EnumRequestContextScope.projectMember,
                RequestProjectMemberStoreKey,
            ],
        ])(
            'throws RequestContextMissingException naming the key for the %s scope without %s',
            (scope, missingKey) => {
                stubRequestStore(clsService, {
                    ...fullStore,
                    [missingKey]: null,
                });

                let thrown: unknown;
                try {
                    factories[scope](scope, executionContext);
                } catch (error) {
                    thrown = error;
                }

                expectRequestContextMissingWithKey(thrown, missingKey);
            }
        );

        it('throws RequestContextMissingException naming request.user when it is null', () => {
            stubRequestStore(clsService, fullStore);

            httpArgumentsHost.getRequest.mockReturnValue({ user: null });

            let thrown: unknown;
            try {
                factories.user(EnumRequestContextScope.user, executionContext);
            } catch (error) {
                thrown = error;
            }

            expectRequestContextMissingWithKey(thrown, 'request.user');
        });

        it.each(['sessionId', 'deviceOwnershipId'])(
            'throws RequestContextMissingException naming request.user.%s when it is missing',
            field => {
                stubRequestStore(clsService, fullStore);

                httpArgumentsHost.getRequest.mockReturnValue({
                    user: { ...session, [field]: undefined },
                });

                let thrown: unknown;
                try {
                    factories.user(
                        EnumRequestContextScope.user,
                        executionContext
                    );
                } catch (error) {
                    thrown = error;
                }

                expectRequestContextMissingWithKey(
                    thrown,
                    `request.user.${field}`
                );
            }
        );
    });

    describe('RequestLanguageCurrent', () => {
        const target = {} as Type<unknown>;
        RequestLanguageCurrent()(target, 'language', 0);
        const factory = getParamDecoratorFactory(target, 'language');

        it('returns the stored language', () => {
            clsService.get.mockReturnValue('en');

            expect(factory(undefined, executionContext)).toBe('en');
            expect(clsService.get).toHaveBeenCalledWith(
                RequestLanguageStoreKey
            );
        });

        it('returns null when the store holds none', () => {
            clsService.get.mockReturnValue(undefined);

            expect(factory(undefined, executionContext)).toBeNull();
        });
    });
});
