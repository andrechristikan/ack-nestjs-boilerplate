import { DatabaseRepositoryBase } from '@common/database/bases/database.repository.base';
import { PolicyDatabaseErrorContract } from '@modules/policy/contracts/policy.database-error.contract';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { Policy } from '@generated/prisma-client/client';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import type { IPolicyRepository } from '@modules/policy/interfaces/policy.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PolicyRepository
    extends DatabaseRepositoryBase
    implements IPolicyRepository
{
    protected override readonly errorContract = PolicyDatabaseErrorContract;

    constructor(
        private readonly databaseService: DatabaseService,
        protected override readonly databaseUtil: DatabaseUtil
    ) {
        super();
    }

    async findOneByRoleIdAndId(
        roleId: string,
        id: string
    ): Promise<Policy | null> {
        return this.databaseService.client.policy.findFirst({
            where: { id, roleId },
        });
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        data: PolicyRequestDto
    ): Promise<Policy> {
        try {
            return await tx.policy.create({
                data: { ...data, roleId },
            });
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async updateInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        id: string,
        data: PolicyUpdateRequestDto
    ): Promise<Policy> {
        try {
            return await tx.policy.update({
                where: { id, roleId },
                data,
            });
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }

    async deleteInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        id: string
    ): Promise<Policy> {
        try {
            return await tx.policy.delete({
                where: { id, roleId },
            });
        } catch (error: unknown) {
            throw this.toException(error);
        }
    }
}
