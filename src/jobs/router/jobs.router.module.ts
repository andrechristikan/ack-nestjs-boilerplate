import { Module } from '@nestjs/common';
import { ApiKeyModule } from 'src/common/api-key/api-key.module';
import { ApiKeyInactiveTask } from 'src/common/api-key/tasks/api-key.inactive.task';

@Module({
    providers: [ApiKeyInactiveTask],
    exports: [],
    imports: [ApiKeyModule],
    controllers: [],
})
export class JobsRouterModule {}
