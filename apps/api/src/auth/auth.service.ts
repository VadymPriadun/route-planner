import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface AuthResponse {
    accessToken: string;
    user: { id: string; email: string; name: string | null };
}

@Injectable()
export class AuthService {
    constructor(
        private readonly users: UsersService,
        private readonly jwt: JwtService,
    ) {}

    async register(dto: RegisterDto): Promise<AuthResponse> {
        if (await this.users.findByEmail(dto.email)) {
            throw new ConflictException('Email is already registered');
        }
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const user = await this.users.create({ email: dto.email, passwordHash, name: dto.name });
        return this.issueToken(user);
    }

    async login(dto: LoginDto): Promise<AuthResponse> {
        const user = await this.users.findByEmail(dto.email);
        const valid = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;
        if (!user || !valid) {
            throw new UnauthorizedException('Invalid email or password');
        }
        return this.issueToken(user);
    }

    private async issueToken(user: {
        id: string;
        email: string;
        name: string | null;
    }): Promise<AuthResponse> {
        const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email });
        return { accessToken, user: { id: user.id, email: user.email, name: user.name } };
    }
}