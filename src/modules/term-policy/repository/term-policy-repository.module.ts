import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from '@common/database/constants/database.constant';
import { TermPolicyRepository } from '@modules/term-policy/repository/repositories/term-policy-repository.service';
import {
  TermPolicyAcceptanceRepository,
} from '@modules/term-policy/repository/repositories/term-policy-acceptance-repository.service';
import { TermPolicyEntity, TermPolicySchema } from '@modules/term-policy/repository/entities/term-policy.entity';
import {
  TermPolicyAcceptanceEntity,
  TermPolicyAcceptanceSchema,
} from '@modules/term-policy/repository/entities/term-policy-acceptance.entity';

@Module({
  providers: [
    TermPolicyRepository,
    TermPolicyAcceptanceRepository,
  ],
  exports: [
    TermPolicyRepository,
    TermPolicyAcceptanceRepository,
  ],
  controllers: [],
  imports: [
    MongooseModule.forFeature(
      [
        {
          name: TermPolicyEntity.name,
          schema: TermPolicySchema,
        },
        {
          name: TermPolicyAcceptanceEntity.name,
          schema: TermPolicyAcceptanceSchema,
        },
      ],
      DATABASE_CONNECTION_NAME,
    ),
  ],
})
export class TermPolicyRepositoryModule {
}