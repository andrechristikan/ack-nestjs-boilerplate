import { DatabaseService } from '@common/database/services/database.service';
import { EnumPolicySubject } from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import type { IPolicyRepository } from '@modules/policy/interfaces/policy.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PolicyRepository implements IPolicyRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async findManyByRoleId(roleId: string): Promise<Policy[]> {
        return this.databaseService.client.policy.findMany({
            where: { roleId },
        });
    }

    async existsByRoleIdAndSubject(
        roleId: string,
        subject: EnumPolicySubject
    ): Promise<boolean> {
        const count = await this.databaseService.client.policy.count({
            where: { roleId, subject },
        });

        return count > 0;
    }

    async existsByRoleIdAndId(roleId: string, id: string): Promise<boolean> {
        const count = await this.databaseService.client.policy.count({
            where: { id, roleId },
        });

        return count > 0;
    }

    async create(roleId: string, data: PolicyRequestDto): Promise<Policy> {
        return this.databaseService.client.policy.create({
            data: { ...data, roleId },
        });
    }

    async update(id: string, data: PolicyUpdateRequestDto): Promise<Policy> {
        return this.databaseService.client.policy.update({
            where: { id },
            data,
        });
    }

    async delete(id: string): Promise<Policy> {
        return this.databaseService.client.policy.delete({ where: { id } });
    }
}
