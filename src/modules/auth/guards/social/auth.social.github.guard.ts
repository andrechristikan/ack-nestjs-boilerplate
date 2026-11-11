import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { AuthSocialGithubRequestSchema } from '@modules/auth/dtos/request/auth.social-github.request.dto';
import { AuthSocialGithubRequiredException } from '@modules/auth/exceptions/auth.social-github-required.exception';
import type { IAuthSocialPayload } from '@modules/auth/interfaces/auth.interface';
import { AuthService } from '@modules/auth/services/auth.service';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class AuthSocialGithubGuard implements CanActivate {
    constructor(private readonly authService: AuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<IRequestApp<IAuthSocialPayload>>();

        const body: Record<string, unknown> = request.body ?? {};
        const parsed = AuthSocialGithubRequestSchema.safeParse({
            code: body.code,
            redirectUri: body.redirectUri,
            codeVerifier: body.codeVerifier,
        });
        if (!parsed.success) {
            throw new AuthSocialGithubRequiredException();
        }

        request.user = await this.authService.validateOAuthGithub(
            parsed.data.code,
            parsed.data.redirectUri,
            parsed.data.codeVerifier
        );

        return true;
    }
}
