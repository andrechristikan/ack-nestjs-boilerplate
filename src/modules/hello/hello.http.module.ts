import { HelloDomainModule } from '@modules/hello/hello.domain.module';
import { HelloHttpService } from '@modules/hello/services/hello.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [HelloHttpService],
    exports: [HelloHttpService],
    imports: [HelloDomainModule],
})
export class HelloHttpModule {}
