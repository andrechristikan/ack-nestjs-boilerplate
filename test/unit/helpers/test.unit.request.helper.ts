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
    EnumRoleScope,
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type {
    ApiKey,
    Project,
    Workspace,
} from '@generated/prisma-client/client';
import { EnumRoleProjectKey } from '@modules/role/enums/role.enum';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.enum';
import type { IRoleRef } from '@modules/role/interfaces/role.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type {
    IAuthJwtAccessContext,
    IAuthJwtRefreshContext,
    IAuthSocialContext,
} from '@modules/auth/interfaces/auth.interface';
import type {
    IProjectContext,
    IProjectMemberWithRole,
} from '@modules/project/interfaces/project.interface';
import type {
    IUser,
    IUserContext,
} from '@modules/user/interfaces/user.interface';
import type {
    IWorkspaceContext,
    IWorkspaceMemberWithRole,
} from '@modules/workspace/interfaces/workspace.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

export interface ICorsConfig {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    exposedHeaders: string[];
    maxAgeInSeconds: number;
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

export function buildRoleRef(
    scope: EnumRoleScope,
    key: string,
    id: string = `role-${scope}-${key}`
): IRoleRef {
    return { id, scope, key, name: key, policyRevision: 0 };
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
        role: buildRoleRef(EnumRoleScope.platform, 'user'),
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
    roleKey: EnumRoleWorkspaceKey = EnumRoleWorkspaceKey.admin
): IWorkspaceMemberWithRole {
    const date = new Date('2026-01-01T00:00:00.000Z');
    const role = buildRoleRef(EnumRoleScope.workspace, roleKey);

    return {
        id: 'member-1',
        createdAt: date,
        createdBy: null,
        updatedAt: date,
        updatedBy: null,
        workspaceId: 'workspace-1',
        userId,
        roleId: role.id,
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
    roleKey: EnumRoleProjectKey = EnumRoleProjectKey.member
): IProjectMemberWithRole {
    const date = new Date('2026-01-01T00:00:00.000Z');
    const role = buildRoleRef(EnumRoleScope.project, roleKey);

    return {
        id: 'project-member-1',
        projectId: 'project-1',
        userId,
        roleId: role.id,
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

export function buildAuthSocialContext(
    email: string,
    subject: string
): IAuthSocialContext {
    return { email, emailVerified: true, subject };
}

export function buildUserContext(user: IUser): IUserContext {
    return { user };
}

export function buildWorkspaceContext(
    workspace: Workspace,
    workspaceMember: IWorkspaceMemberWithRole
): IWorkspaceContext {
    return { workspaceId: workspace.id, workspace, workspaceMember };
}

export function buildProjectContext(
    project: Project,
    projectMember: IProjectMemberWithRole | null
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
        'request.cors.allowedOrigins': config.allowedOrigins,
        'request.cors.allowedMethods': config.allowedMethods,
        'request.cors.allowedHeaders': config.allowedHeaders,
        'request.cors.exposedHeaders': config.exposedHeaders,
        'request.cors.maxAgeInSeconds': config.maxAgeInSeconds,
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
        'request.cors.allowedOrigins': config.allowedOrigins,
        'request.cors.allowedMethods': config.allowedMethods,
        'request.cors.allowedHeaders': config.allowedHeaders,
        'request.cors.exposedHeaders': config.exposedHeaders,
        'request.cors.maxAgeInSeconds': config.maxAgeInSeconds,
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
        'app.urlVersioning.enabled': urlVersionEnable,
        'app.urlVersioning.prefix': 'v',
        'app.urlVersioning.defaultVersion': '1',
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
