import { HelloService } from '@modules/hello/services/hello.service';
import { Module } from '@nestjs/common';

/** Provides the hello health/config probe service. */
@Module({
    controllers: [],
    providers: [HelloService],
    exports: [HelloService],
    imports: [],
})
export class HelloModule {}
