import { WorkspaceInviteUtil } from '@modules/workspace/utils/workspace.invite.util';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [WorkspaceUtil, WorkspaceInviteUtil],
    exports: [WorkspaceUtil, WorkspaceInviteUtil],
    imports: [],
})
export class WorkspaceUtilModule {}
