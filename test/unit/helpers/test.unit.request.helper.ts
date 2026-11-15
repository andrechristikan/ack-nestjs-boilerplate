import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import type { CorsOptions } from 'cors';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestValidationException } from '@common/request/exceptions/request.validation.exception';
import { RequestCorsMiddleware } from '@common/request/middlewares/request.cors.middleware';
import { RequestUrlVersionMiddleware } from '@common/request/middlewares/request.url-version.middleware';
import { RequestSchemaValidationPipe } from '@common/request/pipes/request.schema-validation.pipe';
import type {
    IRequestContext,
    IRequestLog,
} from '@common/request/interfaces/request.interface';
import {
    EnumApiKeyType,
    EnumProjectMemberRole,
    EnumRoleType,
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    ApiKey,
    Project,
    ProjectMember,
    Workspace,
    WorkspaceMember,
} from '@generated/prisma-client/client';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type {
    IAuthJwtAccessContext,
    IAuthJwtRefreshContext,
    IAuthSocialContext,
} from '@modules/auth/interfaces/auth.interface';
import type { IProjectContext } from '@modules/project/interfaces/project.interface';
import type {
    IUser,
    IUserContext,
} from '@modules/user/interfaces/user.interface';
import type { IWorkspaceContext } from '@modules/workspace/interfaces/workspace.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

export interface ICorsConfig {
    allowedOrigin: string | boolean | string[];
    allowedMethod: string[];
    allowedHeader: string[];
    exposedHeader: string[];
}

export interface IFreshCorsMiddleware {
    middleware: RequestCorsMiddleware;
    handler: Mock;
    captured: { options: CorsOptions };
}

export function buildRequestLog(): IRequestLog {
    return {
        userAgent: {
            ua: null,
            browser: null,
            cpu: null,
            device: null,
            engine: null,
            os: null,
        },
        ipAddress: '127.0.0.1',
        geoLocation: null,
    };
}

export function buildRequestContext(): IRequestContext {
    return { requestLog: buildRequestLog(), language: 'en' };
}

export function buildUser(id: string, email: string): IUser {
    const date = new Date('2026-01-01T00:00:00.000Z');

    return {
        id,
        name: 'Jane Doe',
        username: 'jane',
        isVerified: false,
        verifiedAt: null,
        email,
        roleId: 'role-1',
        password: null,
        passwordExpired: null,
        passwordCreated: null,
        passwordAttempt: 0,
        passwordLockedUntil: null,
        signUpAt: date,
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.male,
        countryId: 'country-1',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: EnumUserLoginFrom.website,
        lastLoginWith: EnumUserLoginWith.credential,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: date,
        createdBy: null,
        updatedAt: date,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-1',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            isImmutable: false,
            createdAt: date,
            createdBy: null,
            updatedAt: date,
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };
}

export function buildWorkspace(): Workspace {
    const date = new Date('2026-01-01T00:00:00.000Z');

    return {
        id: 'workspace-1',
        createdAt: date,
        createdBy: null,
        updatedAt: date,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        name: 'Acme',
        slug: 'acme-team',
        description: null,
        isPublic: false,
    };
}

export function buildWorkspaceMember(
    userId: string,
    role: EnumWorkspaceMemberRole = EnumWorkspaceMemberRole.admin
): WorkspaceMember {
    const date = new Date('2026-01-01T00:00:00.000Z');

    return {
        id: 'member-1',
        createdAt: date,
        createdBy: null,
        updatedAt: date,
        updatedBy: null,
        workspaceId: 'workspace-1',
        userId,
        role,
        joinedAt: date,
    };
}

export function buildApiKey(): ApiKey {
    const date = new Date('2026-01-01T00:00:00.000Z');

    return {
        id: 'api-key-1',
        type: EnumApiKeyType.default,
        name: 'key',
        key: 'key-1',
        hash: 'hash-1',
        isActive: true,
        startAt: null,
        endAt: null,
        createdAt: date,
        createdBy: null,
        updatedAt: date,
        updatedBy: null,
    };
}

export function buildProject(): Project {
    const date = new Date('2026-01-01T00:00:00.000Z');

    return {
        id: 'project-1',
        workspaceId: 'workspace-1',
        name: 'Apollo',
        slug: 'apollo',
        description: null,
        createdAt: date,
        createdBy: null,
        updatedAt: date,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
    };
}

export function buildProjectMember(
    userId: string,
    role: EnumProjectMemberRole = EnumProjectMemberRole.member
): ProjectMember {
    const date = new Date('2026-01-01T00:00:00.000Z');

    return {
        id: 'project-member-1',
        projectId: 'project-1',
        userId,
        role,
        joinedAt: date,
        createdAt: date,
        createdBy: null,
        updatedAt: date,
        updatedBy: null,
    };
}

export function buildApiKeyContext(
    apiKey: ApiKey = buildApiKey()
): IApiKeyContext {
    return { apiKey };
}

export function buildAuthJwtAccessContext(
    userId: string
): IAuthJwtAccessContext {
    return {
        userId,
        sessionId: 'session-1',
        deviceOwnershipId: 'device-ownership-1',
        loginWith: EnumUserLoginWith.credential,
    };
}

export function buildAuthJwtRefreshContext(
    userId: string,
    token: string
): IAuthJwtRefreshContext {
    return { ...buildAuthJwtAccessContext(userId), token };
}

export function buildAuthSocialContext(email: string): IAuthSocialContext {
    return { email, emailVerified: true };
}

export function buildUserContext(user: IUser): IUserContext {
    return { user };
}

export function buildWorkspaceContext(
    workspace: Workspace,
    workspaceMember: WorkspaceMember
): IWorkspaceContext {
    return { workspaceId: workspace.id, workspace, workspaceMember };
}

export function buildProjectContext(
    project: Project,
    projectMember: ProjectMember | null
): IProjectContext {
    return { project, projectMember };
}

export function expectRequestContextMissingWithKey(
    thrown: unknown,
    contextKey: string
): void {
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
            message: expect.stringContaining(contextKey),
        }),
    });
}

export function buildRequestSchemaValidationPipe(
    transform: boolean
): RequestSchemaValidationPipe {
    return new RequestSchemaValidationPipe({
        transform,
        exceptionFactory: (issues: readonly StandardSchemaV1.Issue[]) =>
            new RequestValidationException(issues),
    });
}

export async function createRequestCorsMiddleware(
    config: ICorsConfig
): Promise<RequestCorsMiddleware> {
    const configService = buildConfigService({
        'request.cors.allowedOrigin': config.allowedOrigin,
        'request.cors.allowedMethod': config.allowedMethod,
        'request.cors.allowedHeader': config.allowedHeader,
        'request.cors.exposedHeader': config.exposedHeader,
    });

    const module = await Test.createTestingModule({
        providers: [
            RequestCorsMiddleware,
            { provide: ConfigService, useValue: configService },
        ],
    }).compile();

    return module.get(RequestCorsMiddleware);
}

export async function createFreshRequestCorsMiddleware(
    config: ICorsConfig
): Promise<IFreshCorsMiddleware> {
    const handler = vi.fn();
    const captured: { options: CorsOptions } = { options: {} };
    vi.resetModules();
    vi.doMock('cors', () => ({
        default: vi.fn((options: CorsOptions) => {
            captured.options = options;

            return handler;
        }),
    }));
    const { RequestCorsMiddleware: FreshMiddleware } =
        await import('@common/request/middlewares/request.cors.middleware');
    vi.doUnmock('cors');
    const configService = buildConfigService({
        'request.cors.allowedOrigin': config.allowedOrigin,
        'request.cors.allowedMethod': config.allowedMethod,
        'request.cors.allowedHeader': config.allowedHeader,
        'request.cors.exposedHeader': config.exposedHeader,
    });
    const module = await Test.createTestingModule({
        providers: [
            FreshMiddleware,
            { provide: ConfigService, useValue: configService },
        ],
    }).compile();

    return { middleware: module.get(FreshMiddleware), handler, captured };
}

export async function createRequestUrlVersionMiddleware(
    urlVersionEnable: boolean,
    requestStoreService: MockProxy<RequestStoreService>
): Promise<RequestUrlVersionMiddleware> {
    const configService = buildConfigService({
        'app.globalPrefix': '/api',
        'app.urlVersion.enable': urlVersionEnable,
        'app.urlVersion.prefix': 'v',
        'app.urlVersion.version': '1',
    });

    const module = await Test.createTestingModule({
        providers: [
            RequestUrlVersionMiddleware,
            { provide: ConfigService, useValue: configService },
            { provide: RequestStoreService, useValue: requestStoreService },
        ],
    }).compile();

    return module.get(RequestUrlVersionMiddleware);
}
