import { IRequestLog } from '@common/request/interfaces/request.interface';
import { Prisma } from '@generated/prisma-client';
import { EnumUserCreateMode } from '@modules/user/enums/user.enum';
import {
    IUserOnboardingWorkspaceRows,
    IUserSignUpWorkspaceContext,
    IUserSignUpWorkspacePersonal,
} from '@modules/user/interfaces/user.interface';

export interface IUserOnboardingService {
    buildPersonalWorkspaceContexts(
        usernames: string[]
    ): IUserSignUpWorkspacePersonal[];
    buildOnboardingActivityLogs(
        mode: EnumUserCreateMode,
        workspaceContext: IUserSignUpWorkspaceContext,
        requestLog: IRequestLog,
        actorId: string
    ): Prisma.ActivityLogCreateManyUserInput[];
    buildWorkspaceRows(
        userId: string,
        workspaceContext: IUserSignUpWorkspaceContext,
        actorId: string
    ): IUserOnboardingWorkspaceRows;
}
