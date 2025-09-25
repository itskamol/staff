import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { DataScope } from '../../../core/auth/decorators/data-scope.decorator';
import { 
  QueryDto,
  LinkEmployeeDto,
  ComputerUserResponseDto,
  ApiResponseDto
} from '../../../shared/dto';
import { IUserContext, IDataScope } from '../../../shared/interfaces';
import { ComputerUserService } from '../services/computer-user.service';

@ApiTags('Computer Users')
@ApiBearerAuth()
@Controller('computer-users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComputerUserController {
  constructor(private readonly computerUserService: ComputerUserService) {}

  @Get()
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get computer users list',
    description: 'Retrieve a list of computer users with role-based filtering. Admin can see all, HR can see their organization, Department Lead can see their department.'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name, username, or domain' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiResponse({
    status: 200,
    description: 'Computer users retrieved successfully',
    type: [ComputerUserResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getComputerUsers(
    @Query() query: QueryDto,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<ComputerUserResponseDto[]>> {
    const computerUsers = await this.computerUserService.getComputerUsers(query, scope, user);
    
    return {
      success: true,
      data: computerUsers,
      message: 'Computer users retrieved successfully',
    };
  }

  @Get('unlinked')
  @Roles('admin', 'hr')
  @ApiOperation({ 
    summary: 'Get unlinked computer users',
    description: 'Retrieve computer users that are not linked to any employee. Only Admin and HR can access this endpoint.'
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Unlinked computer users retrieved successfully',
    type: [ComputerUserResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Only Admin and HR can access unlinked users' })
  async getUnlinkedComputerUsers(
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<ComputerUserResponseDto[]>> {
    const unlinkedUsers = await this.computerUserService.getUnlinkedComputerUsers(scope, user);
    
    return {
      success: true,
      data: unlinkedUsers,
      message: 'Unlinked computer users retrieved successfully',
    };
  }

  @Get(':id')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get computer user by ID',
    description: 'Retrieve detailed information about a specific computer user'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Computer user ID' })
  @ApiResponse({
    status: 200,
    description: 'Computer user retrieved successfully',
    type: ComputerUserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Computer user not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied to this computer user' })
  async getComputerUserById(
    @Param('id', ParseIntPipe) id: number,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<ComputerUserResponseDto>> {
    const computerUser = await this.computerUserService.getComputerUserById(id, scope, user);
    
    return {
      success: true,
      data: computerUser,
      message: 'Computer user retrieved successfully',
    };
  }

  @Post(':id/link-employee')
  @Roles('admin', 'hr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Link computer user to employee',
    description: 'Create a link between a computer user and an employee. Only Admin and HR can perform this action.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Computer user ID' })
  @ApiBody({ 
    type: LinkEmployeeDto,
    description: 'Employee ID to link to the computer user'
  })
  @ApiResponse({
    status: 200,
    description: 'Computer user linked to employee successfully',
  })
  @ApiResponse({ status: 404, description: 'Computer user or employee not found' })
  @ApiResponse({ status: 400, description: 'Computer user is already linked to an employee' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only Admin and HR can link computer users' })
  async linkToEmployee(
    @Param('id', ParseIntPipe) computerUserId: number,
    @Body() linkEmployeeDto: LinkEmployeeDto,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<null>> {
    await this.computerUserService.linkToEmployee(
      computerUserId,
      linkEmployeeDto.employeeId,
      scope,
      user,
    );
    
    return {
      success: true,
      data: null,
      message: 'Computer user linked to employee successfully',
    };
  }

  @Delete(':id/unlink-employee')
  @Roles('admin', 'hr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Unlink computer user from employee',
    description: 'Remove the link between a computer user and an employee. Only Admin and HR can perform this action.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Computer user ID' })
  @ApiResponse({
    status: 200,
    description: 'Computer user unlinked from employee successfully',
  })
  @ApiResponse({ status: 404, description: 'Computer user not found' })
  @ApiResponse({ status: 400, description: 'Computer user is not linked to any employee' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only Admin and HR can unlink computer users' })
  async unlinkFromEmployee(
    @Param('id', ParseIntPipe) computerUserId: number,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<null>> {
    await this.computerUserService.unlinkFromEmployee(computerUserId, scope, user);
    
    return {
      success: true,
      data: null,
      message: 'Computer user unlinked from employee successfully',
    };
  }

  @Get(':id/activity-summary')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get computer user activity summary',
    description: 'Retrieve activity summary for a specific computer user within a date range'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Computer user ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO format)' })
  @ApiResponse({
    status: 200,
    description: 'Computer user activity summary retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Computer user not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied to this computer user' })
  async getComputerUserActivitySummary(
    @Param('id', ParseIntPipe) computerUserId: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @DataScope() scope?: IDataScope,
    @CurrentUser() user?: IUserContext,
  ): Promise<ApiResponseDto<any>> {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const activitySummary = await this.computerUserService.getComputerUserActivitySummary(
      computerUserId,
      start,
      end,
      scope,
      user,
    );
    
    return {
      success: true,
      data: activitySummary,
      message: 'Computer user activity summary retrieved successfully',
    };
  }

  @Get('search/:searchTerm')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Search computer users',
    description: 'Search for computer users by name, username, or domain'
  })
  @ApiParam({ name: 'searchTerm', type: String, description: 'Search term' })
  @ApiResponse({
    status: 200,
    description: 'Computer users search results retrieved successfully',
    type: [ComputerUserResponseDto],
  })
  async searchComputerUsers(
    @Param('searchTerm') searchTerm: string,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<ComputerUserResponseDto[]>> {
    const searchResults = await this.computerUserService.searchComputerUsers(searchTerm, scope, user);
    
    return {
      success: true,
      data: searchResults,
      message: 'Computer users search completed successfully',
    };
  }

  @Get('employee/:employeeId')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get computer users by employee',
    description: 'Retrieve all computer users linked to a specific employee'
  })
  @ApiParam({ name: 'employeeId', type: Number, description: 'Employee ID' })
  @ApiResponse({
    status: 200,
    description: 'Employee computer users retrieved successfully',
    type: [ComputerUserResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied to this employee' })
  async getComputerUsersByEmployee(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<ComputerUserResponseDto[]>> {
    const computerUsers = await this.computerUserService.getComputerUsersByEmployee(
      employeeId,
      scope,
      user,
    );
    
    return {
      success: true,
      data: computerUsers,
      message: 'Employee computer users retrieved successfully',
    };
  }

  @Get('statistics/overview')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get computer users statistics',
    description: 'Retrieve overview statistics for computer users within the user\'s scope'
  })
  @ApiResponse({
    status: 200,
    description: 'Computer users statistics retrieved successfully',
  })
  async getComputerUsersStatistics(
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<any>> {
    // This would be implemented in the service
    const statistics = {
      totalComputerUsers: 0,
      linkedComputerUsers: 0,
      unlinkedComputerUsers: 0,
      activeComputerUsers: 0,
      inactiveComputerUsers: 0,
      domainUsers: 0,
      localUsers: 0,
    };
    
    return {
      success: true,
      data: statistics,
      message: 'Computer users statistics retrieved successfully',
    };
  }

  @Post('bulk-link')
  @Roles('admin', 'hr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Bulk link computer users to employees',
    description: 'Link multiple computer users to employees in a single operation. Only Admin and HR can perform this action.'
  })
  @ApiBody({
    description: 'Array of computer user ID and employee ID pairs',
    schema: {
      type: 'object',
      properties: {
        links: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              computerUserId: { type: 'number' },
              employeeId: { type: 'number' }
            },
            required: ['computerUserId', 'employeeId']
          }
        }
      },
      required: ['links']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk linking completed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only Admin and HR can perform bulk operations' })
  async bulkLinkComputerUsers(
    @Body() bulkLinkDto: { links: Array<{ computerUserId: number; employeeId: number }> },
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<any>> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const link of bulkLinkDto.links) {
      try {
        await this.computerUserService.linkToEmployee(
          link.computerUserId,
          link.employeeId,
          scope,
          user,
        );
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to link computer user ${link.computerUserId} to employee ${link.employeeId}: ${error.message}`);
      }
    }
    
    return {
      success: true,
      data: results,
      message: `Bulk linking completed. ${results.successful} successful, ${results.failed} failed.`,
    };
  }

  @Delete('bulk-unlink')
  @Roles('admin', 'hr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Bulk unlink computer users from employees',
    description: 'Unlink multiple computer users from employees in a single operation. Only Admin and HR can perform this action.'
  })
  @ApiBody({
    description: 'Array of computer user IDs to unlink',
    schema: {
      type: 'object',
      properties: {
        computerUserIds: {
          type: 'array',
          items: { type: 'number' }
        }
      },
      required: ['computerUserIds']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk unlinking completed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only Admin and HR can perform bulk operations' })
  async bulkUnlinkComputerUsers(
    @Body() bulkUnlinkDto: { computerUserIds: number[] },
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<any>> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const computerUserId of bulkUnlinkDto.computerUserIds) {
      try {
        await this.computerUserService.unlinkFromEmployee(computerUserId, scope, user);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to unlink computer user ${computerUserId}: ${error.message}`);
      }
    }
    
    return {
      success: true,
      data: results,
      message: `Bulk unlinking completed. ${results.successful} successful, ${results.failed} failed.`,
    };
  }
}