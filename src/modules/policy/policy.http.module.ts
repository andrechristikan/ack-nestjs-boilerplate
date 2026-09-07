import { PolicyHttpService } from '@modules/policy/services/policy.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [PolicyHttpService],
    exports: [PolicyHttpService],
    imports: [],
})
export class PolicyHttpModule {}
