import { DatabaseService } from '@common/database/services/database.service';
import { HelperService } from '@common/helper/services/helper.service';
import { Injectable } from '@nestjs/common';
import { Session } from '@prisma/client';

@Injectable()
export class SessionRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly helperService: HelperService
    ) {}

    async findOneActiveSession(id: string): Promise<Session> {
        const today = this.helperService.dateCreate();

        return this.databaseService.session.findFirst({
            where: {
                id,
                expiredAt: {
                    gte: today,
                },
                isRevoked: false,
            },
        });
    }
}
