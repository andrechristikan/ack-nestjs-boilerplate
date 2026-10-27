import { ActivityLogHttpService } from '@modules/activity-log/services/activity-log.http.service';
import { UserDomainModule } from '@modules/user/user.domain.module';
import { WorkspaceDomainModule } from '@modules/workspace/workspace.domain.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [ActivityLogHttpService],
    exports: [ActivityLogHttpService],
    imports: [UserDomainModule, WorkspaceDomainModule],
})
export class ActivityLogHttpModule {}
