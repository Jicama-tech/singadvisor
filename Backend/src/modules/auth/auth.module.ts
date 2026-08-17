import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AdminModule } from '../admin/admin.module';
import { OperatorsModule } from '../operators/operators.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    // `global: true` makes JwtService injectable anywhere (e.g.
    // common/guards/jwt-auth.guard.ts) without importing JwtModule again —
    // needed because AdminModule can't import AuthModule back without a
    // circular dependency (AuthModule already imports AdminModule).
    JwtModule.register({
      global: true,
      secret: process.env.JWT_ACCESS_SECRET || 'secret',
      signOptions: { expiresIn: process.env.JWT_ACCESS_EXPIRY || '8h' },
    }),
    AdminModule,
    OperatorsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
