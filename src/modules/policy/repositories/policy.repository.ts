import { DatabaseService } from '@common/database/services/database.service';
import { EnumPolicySubject, Policy } from '@generated/prisma-client';
import { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PolicyRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async findManyByRoleId(roleId: string): Promise<Policy[]> {
        return this.databaseService.client.policy.findMany({
            where: { roleId },
        });
    }

    async existByRoleIdAndSubject(
        roleId: string,
        subject: EnumPolicySubject
    ): Promise<{ id: string } | null> {
        return this.databaseService.client.policy.findUnique({
            where: { roleId_subject: { roleId, subject } },
            select: { id: true },
        });
    }

    async existByRoleIdAndId(
        roleId: string,
        id: string
    ): Promise<{ id: string } | null> {
        return this.databaseService.client.policy.findFirst({
            where: { id, roleId },
            select: { id: true },
        });
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
