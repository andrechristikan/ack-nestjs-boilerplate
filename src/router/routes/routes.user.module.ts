import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { ActivityLogUserController } from '@modules/activity-log/controllers/activity-log.user.controller';
import { UserUserController } from '@modules/user/controllers/user.user.controller';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [UserUserController, ActivityLogUserController],
    providers: [],
    exports: [],
    imports: [UserModule, ActivityLogModule],
})
export class RoutesUserModule {}
