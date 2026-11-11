import { OutboxModule } from '@modules/outbox/outbox.module';
import { OutboxProcessSweepUseCase } from '@modules/outbox/use-cases/outbox.process-sweep.use-case';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [OutboxProcessSweepUseCase],
    exports: [OutboxProcessSweepUseCase],
    imports: [OutboxModule],
})
export class OutboxUseCaseModule {}
