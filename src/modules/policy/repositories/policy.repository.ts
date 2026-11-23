import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { Prisma } from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { PolicyRuleSelect } from '@modules/policy/constants/policy.constant';
import type { IPolicyRepository } from '@modules/policy/interfaces/policy.repository.interface';
import type {
    IPolicyCreate,
    IPolicyRule,
    IPolicyUpdate,
} from '@modules/policy/interfaces/policy.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PolicyRepository implements IPolicyRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async findManyByRoleId(roleId: string): Promise<Policy[]> {
        return this.databaseService.client.policy.findMany({
            where: { roleId },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });
    }

    async findManyRulesByRoleId(roleId: string): Promise<IPolicyRule[]> {
        return this.databaseService.client.policy.findMany({
            where: { roleId },
            select: PolicyRuleSelect,
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });
    }

    async findOneByRoleIdAndId(
        roleId: string,
        id: string
    ): Promise<Policy | null> {
        return this.databaseService.client.policy.findFirst({
            where: { id, roleId },
        });
    }

    async findOneByRoleIdAndIdInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        id: string
    ): Promise<Policy | null> {
        return tx.policy.findFirst({
            where: { id, roleId },
        });
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        data: IPolicyCreate
    ): Promise<Policy> {
        return tx.policy.create({
            data: {
                ...data,
                conditions: data.conditions ?? Prisma.DbNull,
                roleId,
            },
        });
    }

    async updateInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        id: string,
        data: IPolicyUpdate
    ): Promise<Policy | null> {
        const { count } = await tx.policy.updateMany({
            where: { id, roleId },
            data: {
                ...data,
                conditions: data.conditions ?? Prisma.DbNull,
            },
        });
        if (count === 0) {
            return null;
        }

        return this.findOneByRoleIdAndIdInTx(tx, roleId, id);
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
