import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { ActivityLogProcessor } from '@modules/activity-log/processors/activity-log.processor';
import { ActivityLogGetListOffsetByUserUseCase } from '@modules/activity-log/use-cases/activity-log.get-list-offset-by-user.use-case';
import { ActivityLogGetListCursorByUserUseCase } from '@modules/activity-log/use-cases/activity-log.get-list-cursor-by-user.use-case';
import { ActivityLogGetListOffsetByWorkspaceUseCase } from '@modules/activity-log/use-cases/activity-log.get-list-offset-by-workspace.use-case';
import { ActivityLogGetListCursorByWorkspaceUseCase } from '@modules/activity-log/use-cases/activity-log.get-list-cursor-by-workspace.use-case';
import { ActivityLogProcessCreateManyUseCase } from '@modules/activity-log/use-cases/activity-log.process-create-many.use-case';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        ActivityLogGetListOffsetByUserUseCase,
        ActivityLogGetListCursorByUserUseCase,
        ActivityLogGetListOffsetByWorkspaceUseCase,
        ActivityLogGetListCursorByWorkspaceUseCase,
        ActivityLogProcessCreateManyUseCase,
        ActivityLogProcessor,
    ],
    exports: [
        ActivityLogGetListOffsetByUserUseCase,
        ActivityLogGetListCursorByUserUseCase,
        ActivityLogGetListOffsetByWorkspaceUseCase,
        ActivityLogGetListCursorByWorkspaceUseCase,
        ActivityLogProcessCreateManyUseCase,
    ],
    imports: [ActivityLogModule],
})
export class ActivityLogUseCaseModule {}
