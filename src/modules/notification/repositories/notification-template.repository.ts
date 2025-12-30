import { DatabaseService } from '@common/database/services/database.service';
import { Injectable } from '@nestjs/common';
import { EnumNotificationType, NotificationTemplate } from '@prisma/client';

@Injectable()
export class NotificationTemplateRepository {
    constructor(private readonly databaseService: DatabaseService) {}

    async findByKeyAndLocale(
        key: string,
        locale: string = 'en'
    ): Promise<NotificationTemplate | null> {
        return this.databaseService.notificationTemplate.findFirst({
            where: {
                key,
                locale,
                isActive: true,
            },
        });
    }

    async findByTypeAndLocale(
        type: EnumNotificationType,
        locale: string = 'en'
    ): Promise<NotificationTemplate[]> {
        return this.databaseService.notificationTemplate.findMany({
            where: {
                type,
                locale,
                isActive: true,
            },
        });
    }

    async create(
        key: string,
        type: EnumNotificationType,
        title: string,
        body: string,
        locale: string = 'en',
        createdBy?: string
    ): Promise<NotificationTemplate> {
        return this.databaseService.notificationTemplate.create({
            data: {
                key,
                type,
                locale,
                title,
                body,
                createdBy,
            },
        });
    }

    async update(
        id: string,
        data: { title?: string; body?: string; isActive?: boolean },
        updatedBy?: string
    ): Promise<NotificationTemplate> {
        return this.databaseService.notificationTemplate.update({
            where: { id },
            data: {
                ...data,
                updatedBy,
            },
        });
    }

    async delete(id: string): Promise<void> {
        await this.databaseService.notificationTemplate.delete({
            where: { id },
        });
    }
}
