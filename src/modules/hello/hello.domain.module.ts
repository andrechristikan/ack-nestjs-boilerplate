import { HelloUtil } from '@modules/hello/utils/hello.util';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [HelloUtil],
    exports: [HelloUtil],
    imports: [],
})
export class HelloDomainModule {}
