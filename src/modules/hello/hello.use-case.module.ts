import { HelloModule } from '@modules/hello/hello.module';
import { HelloUseCase } from '@modules/hello/use-cases/hello.use-case';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [HelloUseCase],
    exports: [HelloUseCase],
    imports: [HelloModule],
})
export class HelloUseCaseModule {}
