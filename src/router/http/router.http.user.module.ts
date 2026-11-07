import { ProjectUserController } from '@modules/project/controllers/project.user.controller';
import { ProjectUseCaseModule } from '@modules/project/project.use-case.module';
import { UserUserController } from '@modules/user/controllers/user.user.controller';
import { UserUseCaseModule } from '@modules/user/user.use-case.module';
import { WorkspaceUserController } from '@modules/workspace/controllers/workspace.user.controller';
import { WorkspaceUseCaseModule } from '@modules/workspace/workspace.use-case.module';
import { AnalyticUseCaseModule } from '@modules/analytic/analytic.use-case.module';
import { AnalyticUserController } from '@modules/analytic/controllers/analytic.user.controller';
import { ProjectModule } from '@modules/project/project.module';
import { UserModule } from '@modules/user/user.module';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [
        UserUserController,
        WorkspaceUserController,
        ProjectUserController,
        AnalyticUserController,
    ],
    providers: [],
    exports: [],
    imports: [
        UserUseCaseModule,
        WorkspaceUseCaseModule,
        ProjectUseCaseModule,
        AnalyticUseCaseModule,

        UserModule,
        WorkspaceModule,
        ProjectModule,
    ],
})
export class RouterHttpUserModule {}
