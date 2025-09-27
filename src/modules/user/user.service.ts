import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { UserRepository } from './user.repository';
import { LoggerService } from '@/core/logger';
import { PasswordUtil } from '@/shared/utils';
import { CreateUserDto, UpdateUserDto } from '@/shared/dto';
import { QueryDto } from '@/shared/dto/query.dto';

@Injectable()
export class UserService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly logger: LoggerService
    ) {}

    /**
     * Create a new user
     */
    async createUser(
        createUserDto: CreateUserDto
    ): Promise<Omit<User, 'password'>> {
        // Validate password strength
        const passwordValidation = PasswordUtil.validatePassword(createUserDto.password);
        if (!passwordValidation.isValid) {
            throw new ConflictException(
                `Password validation failed: ${passwordValidation.errors.join(', ')}`
            );
        }

        // Hash password
        const passwordHash = await PasswordUtil.hash(createUserDto.password);

        // Create user
        const { password, ...user } = await this.userRepository.create({
            ...createUserDto,
            password: passwordHash,
        });

        this.logger.logUserAction(user.id, 'USER_CREATED', {
            username: user.username,
        });

        return user;
    }

    /**
     * Find user by ID
     */
    async findById(id: number): Promise<User> {
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }

    /**
     * Find user by email
     */
    async findByUsername(username: string): Promise<User | null> {
        return this.userRepository.findFirst({ username });
    }

    /**
     * Update user
     */
    async updateUser(
        id: number,
        updateUserDto: UpdateUserDto
    ): Promise<Omit<User, 'password'>> {
        const existingUser = await this.userRepository.findById(id);
        if (!existingUser) {
            throw new NotFoundException('User not found');
        }

        if (updateUserDto.password) {
            // Validate password strength
            const passwordValidation = PasswordUtil.validatePassword(updateUserDto.password);
            if (!passwordValidation.isValid) {
                throw new ConflictException(
                    `Password validation failed: ${passwordValidation.errors.join(', ')}`
                );
            }

            // Hash new password
            updateUserDto.password = await PasswordUtil.hash(updateUserDto.password);
        }

        const { password, ...updatedUser } = await this.userRepository.update(id, updateUserDto);

        this.logger.logUserAction(id, 'USER_UPDATED', {
            changes: updateUserDto,
        });

        return updatedUser;
    }

    async getAllUsers({ search, isActive, sort, order, page, limit }: QueryDto) {

        const filters: Prisma.UserWhereInput = {};
                if (search) {
                    filters.OR = [
                        { name: { contains: search, mode: 'insensitive' } },
                        { username: { contains: search, mode: 'insensitive' } },
                    ];
                }
        
                if (typeof isActive === 'boolean') {
                    filters.isActive = isActive;
                }
        
                const [data, total] = await Promise.all([
                    this.userRepository.findMany(
                        filters,
                        { [sort]: order },
                        undefined,
                        { page, limit },
                        { password: false }
                    ),
                    this.userRepository.count(filters),
                ]);

        return {
            data,
            total,
            page,
            limit,
        }
    }

    async deleteUser(id: number): Promise<Omit<User, 'password'>> {
        const existingUser = await this.userRepository.findById(id);
        if (!existingUser) {
            throw new NotFoundException('User not found');
        }

        const { password, ...deletedUser } = await this.userRepository.delete(id);

        this.logger.logUserAction(id, 'USER_DELETED', {
            username: deletedUser.username,
        });

        return deletedUser;
    }
}
