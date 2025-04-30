import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private dataSource: DataSource,
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email');
    }

    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    const jti = uuidv4();
    const refresh_token = this.signRefreshToken(user.id, jti);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Save in DB
    await this.refreshTokenRepo.save({ jti, userId: user.id, expiresAt });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      }
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);

    if (existingUser) {
      throw new UnauthorizedException('Email already exists');
    }

    const user = await this.usersService.create(registerDto);

    const token = this.generateToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    };
  }

  private generateToken(userId: string) {
    const payload = { sub: userId };
    return this.jwtService.sign(payload, { secret: process.env.JWT_SECRET, expiresIn: '15m' });
  }

  private signRefreshToken(userId: string, jti: string) {
    return this.jwtService.sign(
      { sub: userId, jti },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' },
    );
  }

  async rotateRefreshToken(oldToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(oldToken, { secret: process.env.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { sub: userId, jti } = payload;
    const tokenRecord = await this.refreshTokenRepo.findOne({
      where: { jti },
      relations: ['user'],
    });

    // Reject if already revoked or expired
    if (!tokenRecord || tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }

    // Revoke old token and issue a new one atomically
    return this.dataSource.transaction(async manager => {
      tokenRecord.revoked = true;
      await manager.save(tokenRecord);

      const newJti = uuidv4();
      const newToken = this.signRefreshToken(tokenRecord.userId, newJti);
      const newExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await manager.save(
        manager.create(RefreshToken, {
          jti: newJti,
          user: tokenRecord.user,
          expiresAt: newExpires,
        }),
      );

      return {
        access_token: this.generateToken(tokenRecord.userId),
        refresh_token: newToken,
      };
    });
  }

  async logout(userId: string): Promise<any> {
    return await this.refreshTokenRepo.update({ user: { id: userId } }, { revoked: true });
  }

  async validateUser(userId: string): Promise<any> {
    const user = await this.usersService.findOne(userId);

    if (!user) {
      return null;
    }

    return user;
  }

  async validateUserRoles(userId: string, requiredRoles: string[]): Promise<boolean> {
    return true;
  }
}
