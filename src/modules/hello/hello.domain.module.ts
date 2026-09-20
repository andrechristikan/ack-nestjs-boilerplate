import { HelloUtil } from '@modules/hello/utils/hello.util';
import { Module } from '@nestjs/common';

/** Provides the hello health/config probe util. */
@Module({
    controllers: [],
    providers: [HelloUtil],
    exports: [HelloUtil],
    imports: [],
})
export class HelloDomainModule {}
