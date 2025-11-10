import { DynamicModule, Global, Module } from '@nestjs/common';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { AwsModule } from '@common/aws/aws.module';

@Global()
@Module({})
export class TermPolicyModule {
    static forRoot(): DynamicModule {
        return {
            module: TermPolicyModule,
            imports: [AwsModule],
            providers: [
                TermPolicyService,
                TermPolicyRepository,
                TermPolicyUtil,
            ],
            exports: [TermPolicyService, TermPolicyRepository, TermPolicyUtil],
        };
    }
}
