import type { ExecutionContext } from '@nestjs/common';
import {
    SetMetadata,
    UseGuards,
    applyDecorators,
    createParamDecorator,
} from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import {
    RequestCustomTimeoutMetaKey,
    RequestCustomTimeoutValueMetaKey,
    RequestEnvMetaKey,
    RequestEnvProtectedDocErrors,
    RequestLanguageStoreKey,
    RequestLogStoreKey,
    RequestProjectMemberStoreKey,
    RequestProjectStoreKey,
    RequestThrottleOptionsMetaKey,
    RequestUserStoreKey,
    RequestWorkspaceMemberStoreKey,
    RequestWorkspaceStoreKey,
} from '@common/request/constants/request.constant';
import ms from 'ms';
import { RequestEnvGuard } from '@common/request/guards/request.env.guard';
import { RequestThrottleUserGuard } from '@common/request/guards/request.throttle-user.guard';
import { EnumAppEnvironment } from '@app/enums/app.enum';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import type {
    IRequestApp,
    IRequestContextProject,
    IRequestContextProjectMember,
    IRequestContextPublic,
    IRequestContextSession,
    IRequestContextUser,
    IRequestContextWorkspace,
    IRequestLog,
    IRequestThrottleOptions,
} from '@common/request/interfaces/request.interface';
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
import { RequestEnvProtectedEmptyException } from '@common/request/exceptions/request.env-protected-empty.exception';
import { DocErrors } from '@common/doc/decorators/doc.decorator';

/** @public */
export function RequestTimeout(seconds: ms.StringValue): MethodDecorator {
    return applyDecorators(
        SetMetadata(RequestCustomTimeoutMetaKey, true),
        SetMetadata(RequestCustomTimeoutValueMetaKey, seconds)
    );
}

/** @public */
export function RequestEnvProtected(
    ...envs: EnumAppEnvironment[]
): MethodDecorator {
    if (envs.length === 0) {
        throw new RequestEnvProtectedEmptyException();
    }

    return applyDecorators(
        DocErrors(...RequestEnvProtectedDocErrors),
        UseGuards(RequestEnvGuard),
        SetMetadata(RequestEnvMetaKey, envs)
    );
}

/** @public */
export function RequestThrottle(
    options: IRequestThrottleOptions
): MethodDecorator {
    return applyDecorators(
        SetMetadata(RequestThrottleOptionsMetaKey, options),
        UseGuards(RequestThrottleUserGuard)
    );
}

/** @public */
export const RequestIPAddress = createParamDecorator((): string => {
    const requestLog =
        ClsServiceManager.getClsService().get<IRequestLog | null>(
            RequestLogStoreKey
        ) ?? null;
    if (requestLog === null) {
        throw new RequestContextMissingException(RequestLogStoreKey);
    }

    const ipAddress = requestLog.ipAddress ?? null;
    if (ipAddress === null) {
        throw new RequestContextMissingException(
            `${RequestLogStoreKey}.ipAddress`
        );
    }

    return ipAddress;
});

/** @public */
export const RequestUserAgent = createParamDecorator((): UserAgent => {
    const requestLog =
        ClsServiceManager.getClsService().get<IRequestLog | null>(
            RequestLogStoreKey
        ) ?? null;
    if (requestLog === null) {
        throw new RequestContextMissingException(RequestLogStoreKey);
    }

    const userAgent = requestLog.userAgent ?? null;
    if (userAgent === null) {
        throw new RequestContextMissingException(
            `${RequestLogStoreKey}.userAgent`
        );
    }

    return userAgent;
});

/** @public */
export const RequestGeoLocation = createParamDecorator((): GeoLocation => {
    const requestLog =
        ClsServiceManager.getClsService().get<IRequestLog | null>(
            RequestLogStoreKey
        ) ?? null;
    if (requestLog === null) {
        throw new RequestContextMissingException(RequestLogStoreKey);
    }

    const geoLocation = requestLog.geoLocation ?? null;
    if (geoLocation === null) {
        throw new RequestContextMissingException(
            `${RequestLogStoreKey}.geoLocation`
        );
    }

    return geoLocation;
});

function requireStore<T>(key: string, value: T | null | undefined): T {
    if (value === null || value === undefined) {
        throw new RequestContextMissingException(key);
    }

    return value;
}

function readSession(request: IRequestApp): IRequestContextSession {
    const payload = request.user ?? null;
    if (payload === null) {
        throw new RequestContextMissingException('request.user');
    }

    const sessionId = payload.sessionId ?? null;
    if (sessionId === null) {
        throw new RequestContextMissingException('request.user.sessionId');
    }

    const deviceOwnershipId = payload.deviceOwnershipId ?? null;
    if (deviceOwnershipId === null) {
        throw new RequestContextMissingException(
            'request.user.deviceOwnershipId'
        );
    }

    return { sessionId, deviceOwnershipId };
}

const requestContextScopeRank: Record<EnumRequestContextScope, number> = {
    [EnumRequestContextScope.public]: 0,
    [EnumRequestContextScope.user]: 1,
    [EnumRequestContextScope.workspace]: 2,
    [EnumRequestContextScope.project]: 3,
    [EnumRequestContextScope.projectMember]: 4,
};

/**
 * The handler's annotation is the contract: pair each scope with its
 * `IRequestContext*` type (`http.md`, Controllers).
 * @public
 */
export const RequestContextCurrent: (
    scope: EnumRequestContextScope
) => ParameterDecorator = createParamDecorator<
    EnumRequestContextScope,
    | IRequestContextPublic
    | IRequestContextUser
    | IRequestContextWorkspace
    | IRequestContextProject
    | IRequestContextProjectMember
>(
    (
        scope: EnumRequestContextScope,
        ctx: ExecutionContext
    ):
        | IRequestContextPublic
        | IRequestContextUser
        | IRequestContextWorkspace
        | IRequestContextProject
        | IRequestContextProjectMember => {
        const clsService = ClsServiceManager.getClsService();
        const rank = requestContextScopeRank[scope];
        const requestLog = requireStore(
            RequestLogStoreKey,
            clsService.get<IRequestLog | null>(RequestLogStoreKey)
        );
        if (rank < requestContextScopeRank[EnumRequestContextScope.user]) {
            return {
                requestLog,
                snapshot: { actorUserId: null, workspaceId: null, requestLog },
            };
        }

        const user = requireStore(
            RequestUserStoreKey,
            clsService.get<IUser | null>(RequestUserStoreKey)
        );
        const session = readSession(
            ctx.switchToHttp().getRequest<IRequestApp>()
        );
        if (rank < requestContextScopeRank[EnumRequestContextScope.workspace]) {
            return {
                requestLog,
                user,
                session,
                snapshot: {
                    actorUserId: user.id,
                    workspaceId: null,
                    requestLog,
                },
            };
        }

        const workspace = requireStore(
            RequestWorkspaceStoreKey,
            clsService.get<Workspace | null>(RequestWorkspaceStoreKey)
        );
        const workspaceMember = requireStore(
            RequestWorkspaceMemberStoreKey,
            clsService.get<WorkspaceMember | null>(
                RequestWorkspaceMemberStoreKey
            )
        );
        const workspaceContext: IRequestContextWorkspace = {
            requestLog,
            user,
            session,
            workspace,
            workspaceMember,
            snapshot: {
                actorUserId: user.id,
                workspaceId: workspace.id,
                requestLog,
            },
        };
        if (rank < requestContextScopeRank[EnumRequestContextScope.project]) {
            return workspaceContext;
        }

        const projectContext: IRequestContextProject = {
            ...workspaceContext,
            project: requireStore(
                RequestProjectStoreKey,
                clsService.get<Project | null>(RequestProjectStoreKey)
            ),
        };
        if (
            rank <
            requestContextScopeRank[EnumRequestContextScope.projectMember]
        ) {
            return projectContext;
        }

        return {
            ...projectContext,
            projectMember: requireStore(
                RequestProjectMemberStoreKey,
                clsService.get<ProjectMember | null>(
                    RequestProjectMemberStoreKey
                )
            ),
        };
    }
);

/** @public */
export const RequestLanguageCurrent = createParamDecorator(
    (): string | null =>
        ClsServiceManager.getClsService().get<string | null>(
            RequestLanguageStoreKey
        ) ?? null
);
