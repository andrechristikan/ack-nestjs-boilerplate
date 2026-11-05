import { DatabaseService } from '@common/database/services/database.service';
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

    async findOneByRoleIdAndId(
        roleId: string,
        id: string
    ): Promise<Policy | null> {
        return this.databaseService.client.policy.findFirst({
            where: { id, roleId },
        });
    }

    async create(roleId: string, data: PolicyRequestDto): Promise<Policy> {
        return this.databaseService.client.policy.create({
            data: { ...data, roleId },
        });
    }

    async update(
        roleId: string,
        id: string,
        data: PolicyUpdateRequestDto
    ): Promise<Policy | null> {
        const { count } = await this.databaseService.client.policy.updateMany({
            where: { id, roleId },
            data,
        });
        if (count === 0) {
            return null;
        }

        return this.findOneByRoleIdAndId(roleId, id);
    }

    async delete(roleId: string, id: string): Promise<boolean> {
        const { count } = await this.databaseService.client.policy.deleteMany({
            where: { id, roleId },
        });

        return count > 0;
    }
}
