import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { Prisma } from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { PolicyExistException } from '@modules/policy/exceptions/policy.exist.exception';
import { PolicyNotFoundException } from '@modules/policy/exceptions/policy.not-found.exception';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';
import type { IPolicyRepository } from '@modules/policy/interfaces/policy.repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PolicyRepository implements IPolicyRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

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
            throw this.databaseUtil.toUniqueException(
                error,
                [
                    {
                        field: Prisma.PolicyScalarFieldEnum.subject,
                        exception: new PolicyExistException(),
                    },
                ],
                new AppUnknownException(error)
            );
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
            throw this.databaseUtil.toWriteException(
                error,
                new PolicyNotFoundException()
            );
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
            throw this.databaseUtil.toWriteException(
                error,
                new PolicyNotFoundException()
            );
        }
    }
}
