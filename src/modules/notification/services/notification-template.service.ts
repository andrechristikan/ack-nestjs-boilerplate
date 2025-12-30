import { NotificationTemplateRepository } from '@modules/notification/repositories/notification-template.repository';
import { Injectable } from '@nestjs/common';
import { NotificationTemplate } from '@prisma/client';

@Injectable()
export class NotificationTemplateService {
    constructor(
        private readonly notificationTemplateRepository: NotificationTemplateRepository
    ) {}

    async findByKey(
        key: string,
        locale: string = 'en'
    ): Promise<NotificationTemplate | null> {
        // Try to find with requested locale, fallback to 'en'
        let template = await this.notificationTemplateRepository.findByKeyAndLocale(
            key,
            locale
        );

        if (!template && locale !== 'en') {
            template = await this.notificationTemplateRepository.findByKeyAndLocale(
                key,
                'en'
            );
        }

        return template;
    }

    render(
        template: NotificationTemplate,
        variables: Record<string, string | number | boolean>
    ): { title: string; body: string } {
        return {
            title: this.interpolate(template.title, variables),
            body: this.interpolate(template.body, variables),
        };
    }

    renderFromStrings(
        title: string,
        body: string,
        variables: Record<string, string | number | boolean>
    ): { title: string; body: string } {
        return {
            title: this.interpolate(title, variables),
            body: this.interpolate(body, variables),
        };
    }

    private interpolate(
        text: string,
        variables: Record<string, string | number | boolean>
    ): string {
        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            const value = variables[key];
            return value !== undefined ? String(value) : match;
        });
    }
}
