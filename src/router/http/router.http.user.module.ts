import { ProjectUserController } from '@modules/project/controllers/project.user.controller';
import { ProjectModule } from '@modules/project/project.module';
import { UserUserController } from '@modules/user/controllers/user.user.controller';
import { UserModule } from '@modules/user/user.module';
import { WorkspaceUserController } from '@modules/workspace/controllers/workspace.user.controller';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
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
    imports: [UserModule, WorkspaceModule, ProjectModule],
})
export class RouterHttpUserModule {}
