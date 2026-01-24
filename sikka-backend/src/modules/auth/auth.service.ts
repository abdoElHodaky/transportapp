import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from '../../entities/user.entity';
import { Wallet } from '../../entities/wallet.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    private jwtService: JwtService,
  ) {}

  async register(userData: {
    phone: string;
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
  }) {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { phone: userData.phone },
    });

    if (existingUser) {
      throw new ConflictException('User with this phone number already exists');
    }

    // Hash password if provided
    let hashedPassword = null;
    if (userData.password) {
      hashedPassword = await bcrypt.hash(userData.password, 10);
    }

    // Generate OTP
    const otpCode = this.generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user
    const user = this.userRepository.create({
      phone: userData.phone,
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      role: userData.role || UserRole.PASSENGER,
      status: UserStatus.PENDING_VERIFICATION,
      otpCode,
      otpExpiresAt,
      otpAttempts: 0,
    });

    const savedUser = await this.userRepository.save(user);

    // Create wallet for the user
    const wallet = this.walletRepository.create({
      userId: savedUser.id,
      balance: 0,
      totalEarnings: 0,
      totalSpent: 0,
      totalTopups: 0,
      totalWithdrawals: 0,
      pendingAmount: 0,
      reservedAmount: 0,
      dailySpendLimit: 10000, // SDG 10,000
      monthlySpendLimit: 50000, // SDG 50,000
      dailySpentAmount: 0,
      monthlySpentAmount: 0,
      pinEnabled: false,
      failedPinAttempts: 0,
    });

    await this.walletRepository.save(wallet);

    // Send OTP via SMS (implement SMS service)
    await this.sendOTP(userData.phone, otpCode);

    return {
      message: 'Registration successful. Please verify your phone number.',
      userId: savedUser.id,
      phone: savedUser.phone,
    };
  }

  async verifyOTP(phone: string, otpCode: string) {
    const user = await this.userRepository.findOne({
      where: { phone },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.otpAttempts >= 3) {
      throw new BadRequestException('Too many OTP attempts. Please request a new OTP.');
    }

    if (!user.otpCode || user.otpCode !== otpCode) {
      await this.userRepository.update(user.id, {
        otpAttempts: user.otpAttempts + 1,
      });
      throw new UnauthorizedException('Invalid OTP code');
    }

    if (user.otpExpiresAt < new Date()) {
      throw new UnauthorizedException('OTP code has expired');
    }

    // Update user status
    await this.userRepository.update(user.id, {
      phoneVerified: true,
      status: UserStatus.ACTIVE,
      otpCode: null,
      otpExpiresAt: null,
      otpAttempts: 0,
    });

    // Generate JWT tokens
    const tokens = await this.generateTokens(user);

    return {
      message: 'Phone verification successful',
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        status: UserStatus.ACTIVE,
      },
      ...tokens,
    };
  }

  async login(phone: string, password?: string) {
    const user = await this.userRepository.findOne({
      where: { phone },
      relations: ['wallet'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account is suspended');
    }

    // For password-based login
    if (password) {
      if (!user.password) {
        throw new UnauthorizedException('Password not set for this account');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      if (!user.phoneVerified) {
        throw new UnauthorizedException('Phone number not verified');
      }

      // Update last login
      await this.userRepository.update(user.id, {
        lastLoginAt: new Date(),
      });

      const tokens = await this.generateTokens(user);

      return {
        message: 'Login successful',
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          rating: user.rating,
          totalTrips: user.totalTrips,
          wallet: user.wallet,
        },
        ...tokens,
      };
    }

    // For OTP-based login
    const otpCode = this.generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.userRepository.update(user.id, {
      otpCode,
      otpExpiresAt,
      otpAttempts: 0,
    });

    await this.sendOTP(phone, otpCode);

    return {
      message: 'OTP sent to your phone number',
      requiresOTP: true,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user);
      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.userRepository.update(userId, {
      refreshToken: null,
    });

    return { message: 'Logout successful' };
  }

  async resendOTP(phone: string) {
    const user = await this.userRepository.findOne({
      where: { phone },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const otpCode = this.generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.userRepository.update(user.id, {
      otpCode,
      otpExpiresAt,
      otpAttempts: 0,
    });

    await this.sendOTP(phone, otpCode);

    return { message: 'OTP sent successfully' };
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async generateTokens(user: User) {
    const payload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '24h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    // Store refresh token
    await this.userRepository.update(user.id, {
      refreshToken,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
    };
  }

  private async sendOTP(phone: string, otpCode: string) {
    // TODO: Implement SMS service integration
    // For now, log the OTP (remove in production)
    console.log(`OTP for ${phone}: ${otpCode}`);
    
    // In production, integrate with SMS service like:
    // - Twilio
    // - AWS SNS
    // - Local Sudanese SMS provider
    
    return true;
  }
      role: userData.role || UserRole.PASSENGER,
      status: UserStatus.PENDING_VERIFICATION,
      otpCode,
      otpExpiresAt,
    });

    const savedUser = await this.userRepository.save(user);

    // Create wallet for the user
    const wallet = this.walletRepository.create({
      user: savedUser,
      balance: 0,
      currency: 'SDG',
    });
    await this.walletRepository.save(wallet);

    // TODO: Send OTP via SMS
    console.log(`OTP for ${userData.phone}: ${otpCode}`);

    return {
      message: 'User registered successfully. Please verify your phone number.',
      userId: savedUser.id,
      phone: savedUser.phone,
    };
  }

  async login(credentials: { phone: string; password?: string }) {
    const user = await this.userRepository.findOne({
      where: { phone: credentials.phone },
      relations: ['wallet'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account is suspended');
    }

    if (!user.phoneVerified) {
      throw new UnauthorizedException('Phone number not verified');
    }

    // If password is provided, verify it
    if (credentials.password) {
      if (!user.password) {
        throw new UnauthorizedException('Password not set for this account');
      }

      const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    // Generate JWT token
    const payload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
      status: user.status,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        rating: user.rating,
        totalTrips: user.totalTrips,
        wallet: {
          balance: user.wallet?.balance || 0,
          currency: user.wallet?.currency || 'SDG',
        },
      },
    };
  }

  async verifyOTP(phone: string, otp: string) {
    const user = await this.userRepository.findOne({
      where: { phone },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.otpCode || user.otpCode !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (user.otpExpiresAt < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    // Mark phone as verified and clear OTP
    user.phoneVerified = true;
    user.status = UserStatus.ACTIVE;
    user.otpCode = null;
    user.otpExpiresAt = null;

    await this.userRepository.save(user);

    // Generate JWT token
    const payload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
      status: user.status,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      message: 'Phone number verified successfully',
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    };
  }

  async resendOTP(phone: string) {
    const user = await this.userRepository.findOne({
      where: { phone },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.phoneVerified) {
      throw new BadRequestException('Phone number already verified');
    }

    // Generate new OTP
    const otpCode = this.generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otpCode = otpCode;
    user.otpExpiresAt = otpExpiresAt;

    await this.userRepository.save(user);

    // TODO: Send OTP via SMS
    console.log(`New OTP for ${phone}: ${otpCode}`);

    return {
      message: 'OTP sent successfully',
    };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Invalid token');
      }

      const newPayload = {
        sub: user.id,
        phone: user.phone,
        role: user.role,
        status: user.status,
      };

      const accessToken = this.jwtService.sign(newPayload);

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['wallet'],
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid user');
    }

    return user;
  }
}
