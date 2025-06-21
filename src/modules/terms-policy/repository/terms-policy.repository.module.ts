import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from '@common/database/constants/database.constant';
import { TermsPolicyRepository } from '@modules/terms-policy/repository/repositories/terms-policy.repository';
import {
  TermsPolicyAcceptanceRepository,
} from '@modules/terms-policy/repository/repositories/terms-policy-acceptance.repository';
import { TermsPolicyEntity, TermsPolicySchema } from '@modules/terms-policy/repository/entities/terms-policy.entity';
import {
  TermsPolicyAcceptanceEntity,
  TermsPolicyAcceptanceSchema,
} from '@modules/terms-policy/repository/entities/terms-policy.acceptance.entity';

@Module({
  providers: [
    TermsPolicyRepository,
    TermsPolicyAcceptanceRepository,
  ],
  exports: [
    TermsPolicyRepository,
    TermsPolicyAcceptanceRepository,
  ],
  controllers: [],
  imports: [
    MongooseModule.forFeature(
      [
        {
          name: TermsPolicyEntity.name,
          schema: TermsPolicySchema,
        },
        {
          name: TermsPolicyAcceptanceEntity.name,
          schema: TermsPolicyAcceptanceSchema,
        },
      ],
      DATABASE_CONNECTION_NAME,
    ),
  ],
})
export class TermsPolicyRepositoryModule {
}