import { InviteConfig } from '@modules/invite/interfaces/invite.interface';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class InviteConfigRegistry {
    private readonly logger = new Logger(InviteConfigRegistry.name);
    private readonly registry = new Map<string, InviteConfig>();

    register(invitationType: string, config: InviteConfig): void {
        const existing = this.registry.get(invitationType);
        if (existing) {
            throw new Error(
                `Duplicate invite config registration for "${invitationType}"`
            );
        }

        this.registry.set(invitationType, config);
        this.logger.debug(
            `Registered invite config for type "${invitationType}": ${JSON.stringify(config)}`
        );
    }

    getOrThrow(invitationType: string): InviteConfig {
        const config = this.registry.get(invitationType);
        if (!config) {
            throw new Error(
                `Invite config not registered for "${invitationType}"`
            );
        }

        return config;
    }
}
