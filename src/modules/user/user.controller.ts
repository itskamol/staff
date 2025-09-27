import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Put,
    Post,
    Query,
    Delete,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiExtraModels,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import {
    ApiSuccessResponse,
    CreateUserDto,
    UpdateUserDto,
    UserResponseDto,
} from '@/shared/dto';
import { NoScoping, Roles, User } from '@/shared/decorators';
import { UserContext } from '@/shared/interfaces';
import { Role, User as UserModel } from '@prisma/client';
import { ApiCrudOperation } from '@/shared/utils';
import { QueryDto } from '@/shared/dto/query.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('users')
@ApiExtraModels(ApiSuccessResponse, UserResponseDto)
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post()
    @NoScoping()
    @ApiCrudOperation(UserResponseDto, 'create', {
        body: CreateUserDto,
        summary: 'Create a new user',
        errorResponses: { badRequest: true, conflict: true },
    })
    async createUser(
        @Body() createUserDto: CreateUserDto,
        @User() user: UserContext
    ): Promise<Omit<UserModel, 'password'>> {
        return this.userService.createUser(createUserDto);
    }

    @Get()
    @ApiCrudOperation(UserResponseDto, 'list', {
        summary: 'Get all users',
        includeQueries: {
            pagination: true,
            search: true,
            sort: true,
            filters: ['isActive'],
        },
    })
    async getAllUsers(@Query() query: QueryDto) {
        return this.userService.getAllUsers(query);
    }

    @Get(':id')
    @ApiParam({ name: 'id', description: 'ID of the user' })
    @ApiCrudOperation(UserResponseDto, 'get', {
        summary: 'Get a specific user by ID',
    })
    async getUserById(@Param('id') id: number): Promise<UserModel> {
        const user = await this.userService.findById(id);
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }

    @Put(':id')
    @ApiParam({ name: 'id', description: 'ID of the user to update' })
    @ApiCrudOperation(UserResponseDto, 'update', {
        body: UpdateUserDto,
        summary: 'Update a user',
    })
    async updateUser(
        @Param('id') id: number,
        @Body() updateUserDto: UpdateUserDto,
        @User() user: UserContext
    ): Promise<UserResponseDto> {
        return this.userService.updateUser(id, updateUserDto);
    }

    @Delete(':id')
    @ApiParam({ name: 'id', description: 'ID of the user to delete' })
    @ApiCrudOperation(UserResponseDto, 'delete', {
        summary: 'Delete a user',
        errorResponses: { notFound: true },
    })
    async deleteUser(@Param('id') id: number): Promise<UserResponseDto> {
        return this.userService.deleteUser(id);
    }
}
