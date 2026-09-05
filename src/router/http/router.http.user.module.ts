import { ProjectUserController } from '@modules/project/controllers/project.user.controller';
import { ProjectHttpModule } from '@modules/project/project.http.module';
import { UserUserController } from '@modules/user/controllers/user.user.controller';
import { UserHttpModule } from '@modules/user/user.http.module';
import { WorkspaceUserController } from '@modules/workspace/controllers/workspace.user.controller';
import { WorkspaceHttpModule } from '@modules/workspace/workspace.http.module';
import { Module } from '@nestjs/common';

/**
 * Mounts controllers for the authenticated end-user scope.
 */
@Module({
    controllers: [
        UserUserController,
        WorkspaceUserController,
        ProjectUserController,
    ],
    providers: [],
    exports: [],
    imports: [UserHttpModule, WorkspaceHttpModule, ProjectHttpModule],
})
export class RouterHttpUserModule {}
