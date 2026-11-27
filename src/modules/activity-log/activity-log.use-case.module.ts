import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { ActivityLogGetListOffsetByUserUseCase } from '@modules/activity-log/use-cases/activity-log.get-list-offset-by-user.use-case';
import { ActivityLogGetListCursorByUserUseCase } from '@modules/activity-log/use-cases/activity-log.get-list-cursor-by-user.use-case';
import { ActivityLogGetListOffsetByApiKeyUseCase } from '@modules/activity-log/use-cases/activity-log.get-list-offset-by-api-key.use-case';
import { ActivityLogGetListOffsetByWorkspaceUseCase } from '@modules/activity-log/use-cases/activity-log.get-list-offset-by-workspace.use-case';
import { ActivityLogGetListCursorByWorkspaceUseCase } from '@modules/activity-log/use-cases/activity-log.get-list-cursor-by-workspace.use-case';
import { ActivityLogProcessCreateManyUseCase } from '@modules/activity-log/use-cases/activity-log.process-create-many.use-case';
import { ActivityLogProcessPurgeExpiredUseCase } from '@modules/activity-log/use-cases/activity-log.process-purge-expired.use-case';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        ActivityLogGetListOffsetByApiKeyUseCase,
        ActivityLogGetListOffsetByUserUseCase,
        ActivityLogGetListCursorByUserUseCase,
        ActivityLogGetListOffsetByWorkspaceUseCase,
        ActivityLogGetListCursorByWorkspaceUseCase,
        ActivityLogProcessCreateManyUseCase,
        ActivityLogProcessPurgeExpiredUseCase,
    ],
    exports: [
        ActivityLogGetListOffsetByApiKeyUseCase,
        ActivityLogGetListOffsetByUserUseCase,
        ActivityLogGetListCursorByUserUseCase,
        ActivityLogGetListOffsetByWorkspaceUseCase,
        ActivityLogGetListCursorByWorkspaceUseCase,
        ActivityLogProcessCreateManyUseCase,
        ActivityLogProcessPurgeExpiredUseCase,
    ],
    imports: [ActivityLogModule],
})
export class ActivityLogUseCaseModule {}
