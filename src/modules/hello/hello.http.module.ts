import { HelloModule } from '@modules/hello/hello.module';
import { HelloHttpService } from '@modules/hello/services/hello.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [HelloHttpService],
    exports: [HelloHttpService],
    imports: [HelloModule],
})
export class HelloHttpModule {}
