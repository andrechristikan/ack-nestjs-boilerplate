import { DatabaseService } from '@common/database/services/database.service';
import { Prisma } from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import type { PolicyCreateRequestDto } from '@modules/policy/dtos/request/policy.create.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import type { IPolicyRuleWithRole } from '@modules/policy/interfaces/policy.interface';
import type { IPolicyRepository } from '@modules/policy/interfaces/policy.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PolicyRepository implements IPolicyRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async findManyByRoleId(
        roleId: string,
        where?: Prisma.RoleWhereInput
    ): Promise<Policy[]> {
        return this.databaseService.client.policy.findMany({
            where: { AND: [{ roleId }, where ? { role: where } : {}] },
        });
    }

    async findManyByRoleIds(roleIds: string[]): Promise<IPolicyRuleWithRole[]> {
        return this.databaseService.client.policy.findMany({
            where: { roleId: { in: roleIds } },
            select: {
                roleId: true,
                subject: true,
                action: true,
                conditions: true,
                inverted: true,
                reason: true,
            },
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

    async existsByRoleIdAndId(roleId: string, id: string): Promise<boolean> {
        const count = await this.databaseService.client.policy.count({
            where: { id, roleId },
        });

        return count > 0;
    }

    async create(
        roleId: string,
        {
            subject,
            action,
            conditions,
            inverted,
            reason,
        }: PolicyCreateRequestDto
    ): Promise<Policy> {
        return this.databaseService.client.policy.create({
            data: {
                roleId,
                subject,
                action,
                conditions: conditions ?? Prisma.DbNull,
                inverted: inverted ?? false,
                reason: reason ?? null,
            },
        });
    }

    async update(
        id: string,
        { action, conditions, inverted, reason }: PolicyUpdateRequestDto
    ): Promise<Policy> {
        return this.databaseService.client.policy.update({
            where: { id },
            data: {
                action,
                conditions: conditions ?? Prisma.DbNull,
                inverted: inverted ?? false,
                reason: reason ?? null,
            },
        });
    }

    async delete(id: string): Promise<Policy> {
        return this.databaseService.client.policy.delete({ where: { id } });
    }
}
