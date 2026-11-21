import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type { Policy } from '@generated/prisma-client/client';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import type { IPolicyRepository } from '@modules/policy/interfaces/policy.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PolicyRepository implements IPolicyRepository {
    constructor(private readonly databaseService: DatabaseService) {}

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
        return tx.policy.create({
            data: { ...data, roleId },
        });
    }

    async updateInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        id: string,
        data: PolicyUpdateRequestDto
    ): Promise<Policy | null> {
        const { count } = await tx.policy.updateMany({
            where: { id, roleId },
            data,
        });
        if (count === 0) {
            return null;
        }

        return tx.policy.findFirst({
            where: { id, roleId },
        });
    }

    async deleteInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        id: string
    ): Promise<boolean> {
        const { count } = await tx.policy.deleteMany({
            where: { id, roleId },
        });

        return count > 0;
    }
}
