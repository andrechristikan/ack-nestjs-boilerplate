import { HelloService } from '@modules/hello/services/hello.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [HelloService],
    exports: [HelloService],
    imports: [],
})
export class HelloModule {}
