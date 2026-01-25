import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from '../../dto/auth/register.dto';
import { LoginDto } from '../../dto/auth/login.dto';
import { VerifyOtpDto } from '../../dto/auth/verify-otp.dto';
import { ResendOtpDto } from '../../dto/auth/resend-otp.dto';
import { RefreshTokenDto } from '../../dto/auth/refresh-token.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register new user with phone number',
    description:
      'Register a new user account. An OTP will be sent to the provided phone number for verification.',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully. OTP sent to phone number.',
    schema: {
      example: {
        message:
          'User registered successfully. Please verify your phone number.',
        userId: 'uuid-string',
        phone: '+249123456789',
      },
    },
  })
  @ApiConflictResponse({
    description: 'User with this phone number already exists',
    schema: {
      example: {
        statusCode: 409,
        message: 'User with this phone number already exists',
        error: 'Conflict',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: ['phone must be a valid phone number'],
        error: 'Bad Request',
      },
    },
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP and activate account',
    description:
      'Verify the OTP sent to the phone number and activate the user account.',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully. User account activated.',
    schema: {
      example: {
        message: 'Phone number verified successfully',
        accessToken: 'jwt-token-string',
        user: {
          id: 'uuid-string',
          phone: '+249123456789',
          name: 'Ahmed Ali',
          role: 'passenger',
          status: 'active',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid OTP or OTP expired',
    schema: {
      example: {
        statusCode: 400,
        message: 'Invalid OTP',
        error: 'Bad Request',
      },
    },
  })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOTP(verifyOtpDto.phone, verifyOtpDto.otp);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend OTP to phone number',
    description: 'Resend a new OTP to the phone number for verification.',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    schema: {
      example: {
        message: 'OTP sent successfully',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'User not found or phone already verified',
    schema: {
      example: {
        statusCode: 400,
        message: 'Phone number already verified',
        error: 'Bad Request',
      },
    },
  })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendOTP(resendOtpDto.phone);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with phone number',
    description:
      'Login with phone number and optional password. Returns JWT token and user data.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        accessToken: 'jwt-token-string',
        user: {
          id: 'uuid-string',
          phone: '+249123456789',
          name: 'Ahmed Ali',
          email: 'ahmed@example.com',
          role: 'passenger',
          status: 'active',
          rating: 4.8,
          totalTrips: 25,
          wallet: {
            balance: 150.75,
            currency: 'SDG',
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid credentials or phone not verified',
    schema: {
      example: {
        statusCode: 401,
        message: 'Phone number not verified',
        error: 'Unauthorized',
      },
    },
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Refresh the JWT access token using a valid token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      example: {
        accessToken: 'new-jwt-token-string',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid token',
        error: 'Unauthorized',
      },
    },
  })
  async refresh(@Body() refreshDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshDto.token);
  }
}
