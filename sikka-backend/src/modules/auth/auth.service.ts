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

