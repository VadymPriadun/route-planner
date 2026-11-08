import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { loadEnv } from '../config/env';

const env = loadEnv();

@Module({
    imports: [
        UsersModule,
        JwtModule.register({
            global: true,
            secret: env.jwtSecret,
            signOptions: { expiresIn: env.jwtExpiresInSeconds },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService],
})
export class AuthModule {}