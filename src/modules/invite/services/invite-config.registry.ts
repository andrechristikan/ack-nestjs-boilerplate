import { InviteConfig } from '@modules/invite/interfaces/invite.interface';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class InviteConfigRegistry {
    private readonly logger = new Logger(InviteConfigRegistry.name);
    private readonly registry = new Map<string, InviteConfig>();

    register(inviteType: string, config: InviteConfig): void {
        const existing = this.registry.get(inviteType);
        if (existing) {
            throw new Error(
                `Duplicate invite config registration for "${inviteType}"`
            );
        }

        this.registry.set(inviteType, config);
        this.logger.debug(
            `Registered invite config for type "${inviteType}": ${JSON.stringify(config)}`
        );
    }

    getOrThrow(inviteType: string): InviteConfig {
        const config = this.registry.get(inviteType);
        if (!config) {
            throw new Error(
                `Invite config not registered for "${inviteType}"`
            );
        }

        return config;
    }
}
