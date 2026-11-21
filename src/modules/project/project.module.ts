import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { EnumProjectQueue } from '@modules/project/enums/project.enum';
import { ProjectQueueFactory } from '@modules/project/factories/project.queue.factory';
import { ProjectQueue } from '@modules/project/queues/project.queue';
import { ProjectMemberRepository } from '@modules/project/repositories/project.member.repository';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        ProjectRepository,
        ProjectMemberRepository,
        ProjectService,
        ProjectMemberService,
        ProjectUtil,
        ProjectQueue,
        {
            provide: EnumProjectQueue.project,
            useExisting: ProjectQueue,
        },
    ],
    exports: [ProjectService, ProjectMemberService, ProjectUtil, ProjectQueue],
    imports: [
        ActivityLogModule,
        BullModule.registerQueueAsync({
            name: EnumProjectQueue.project,
            useClass: ProjectQueueFactory,
        }),
    ],
})
export class ProjectModule {}
