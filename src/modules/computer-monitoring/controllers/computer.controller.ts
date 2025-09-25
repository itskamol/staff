import {
  Controller,
  Get,
  Post,
  Put,
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
  ComputerResponseDto,
  ComputerUserResponseDto,
  ApiResponseDto
} from '../../../shared/dto';
import { IUserContext, IDataScope } from '../../../shared/interfaces';
import { ComputerService } from '../services/computer.service';

@ApiTags('Computers')
@ApiBearerAuth()
@Controller('computers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ComputerController {
  constructor(private readonly computerService: ComputerService) {}

  @Get()
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get computers list',
    description: 'Retrieve a list of computers with role-based filtering. Admin can see all, HR can see their organization, Department Lead can see their department.'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by computer UID, OS, or IP address' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiResponse({
    status: 200,
    description: 'Computers retrieved successfully',
    type: [ComputerResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getComputers(
    @Query() query: QueryDto,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<ComputerResponseDto[]>> {
    const computers = await this.computerService.getComputers(query, scope, user);
    
    return {
      success: true,
      data: computers,
      message: 'Computers retrieved successfully',
    };
  }

  @Get(':id')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get computer by ID',
    description: 'Retrieve detailed information about a specific computer'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Computer ID' })
  @ApiResponse({
    status: 200,
    description: 'Computer retrieved successfully',
    type: ComputerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Computer not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied to this computer' })
  async getComputerById(
    @Param('id', ParseIntPipe) id: number,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<ComputerResponseDto>> {
    const computer = await this.computerService.getComputerById(id, scope, user);
    
    return {
      success: true,
      data: computer,
      message: 'Computer retrieved successfully',
    };
  }

  @Get('uid/:computerUid')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get computer by UID',
    description: 'Retrieve detailed information about a computer by its unique identifier'
  })
  @ApiParam({ name: 'computerUid', type: String, description: 'Computer unique identifier' })
  @ApiResponse({
    status: 200,
    description: 'Computer retrieved successfully',
    type: ComputerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Computer not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied to this computer' })
  async getComputerByUid(
    @Param('computerUid') computerUid: string,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<ComputerResponseDto>> {
    const computer = await this.computerService.getComputerByUid(computerUid, scope, user);
    
    return {
      success: true,
      data: computer,
      message: 'Computer retrieved successfully',
    };
  }

  @Get(':id/users')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get computer users',
    description: 'Retrieve all users associated with a specific computer'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Computer ID' })
  @ApiResponse({
    status: 200,
    description: 'Computer users retrieved successfully',
    type: [ComputerUserResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Computer not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied to this computer' })
  async getComputerUsers(
    @Param('id', ParseIntPipe) computerId: number,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<ComputerUserResponseDto[]>> {
    const computerUsers = await this.computerService.getComputerUsers(computerId, scope, user);
    
    return {
      success: true,
      data: computerUsers,
      message: 'Computer users retrieved successfully',
    };
  }

  @Get('search/:searchTerm')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Search computers',
    description: 'Search for computers by UID, OS, IP address, or MAC address'
  })
  @ApiParam({ name: 'searchTerm', type: String, description: 'Search term' })
  @ApiResponse({
    status: 200,
    description: 'Computer search results retrieved successfully',
    type: [ComputerResponseDto],
  })
  async searchComputers(
    @Param('searchTerm') searchTerm: string,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<ComputerResponseDto[]>> {
    const searchResults = await this.computerService.searchComputers(searchTerm, scope, user);
    
    return {
      success: true,
      data: searchResults,
      message: 'Computer search completed successfully',
    };
  }

  @Get('organization/:organizationId')
  @Roles('admin', 'hr')
  @ApiOperation({ 
    summary: 'Get computers by organization',
    description: 'Retrieve all computers used by employees in a specific organization. Only Admin and HR can access this endpoint.'
  })
  @ApiParam({ name: 'organizationId', type: Number, description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization computers retrieved successfully',
    type: [ComputerResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied to this organization' })
  async getComputersByOrganization(
    @Param('organizationId', ParseIntPipe) organizationId: number,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<ComputerResponseDto[]>> {
    const computers = await this.computerService.getComputersByOrganization(organizationId, user);
    
    return {
      success: true,
      data: computers,
      message: 'Organization computers retrieved successfully',
    };
  }

  @Get('department/:departmentId')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get computers by department',
    description: 'Retrieve all computers used by employees in a specific department'
  })
  @ApiParam({ name: 'departmentId', type: Number, description: 'Department ID' })
  @ApiResponse({
    status: 200,
    description: 'Department computers retrieved successfully',
    type: [ComputerResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Department not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied to this department' })
  async getComputersByDepartment(
    @Param('departmentId', ParseIntPipe) departmentId: number,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<ComputerResponseDto[]>> {
    const computers = await this.computerService.getComputersByDepartment(departmentId, user);
    
    return {
      success: true,
      data: computers,
      message: 'Department computers retrieved successfully',
    };
  }

  @Post(':id/associate-user/:computerUserId')
  @Roles('admin', 'hr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Associate user with computer',
    description: 'Create an association between a computer and a computer user. Only Admin and HR can perform this action.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Computer ID' })
  @ApiParam({ name: 'computerUserId', type: Number, description: 'Computer User ID' })
  @ApiResponse({
    status: 200,
    description: 'User associated with computer successfully',
  })
  @ApiResponse({ status: 404, description: 'Computer or computer user not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only Admin and HR can associate users' })
  async associateUserWithComputer(
    @Param('id', ParseIntPipe) computerId: number,
    @Param('computerUserId', ParseIntPipe) computerUserId: number,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<null>> {
    await this.computerService.associateUserWithComputer(computerId, computerUserId, scope, user);
    
    return {
      success: true,
      data: null,
      message: 'User associated with computer successfully',
    };
  }

  @Delete(':id/dissociate-user/:computerUserId')
  @Roles('admin', 'hr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Dissociate user from computer',
    description: 'Remove the association between a computer and a computer user. Only Admin and HR can perform this action.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Computer ID' })
  @ApiParam({ name: 'computerUserId', type: Number, description: 'Computer User ID' })
  @ApiResponse({
    status: 200,
    description: 'User dissociated from computer successfully',
  })
  @ApiResponse({ status: 404, description: 'Computer or computer user not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only Admin and HR can dissociate users' })
  async dissociateUserFromComputer(
    @Param('id', ParseIntPipe) computerId: number,
    @Param('computerUserId', ParseIntPipe) computerUserId: number,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<null>> {
    await this.computerService.dissociateUserFromComputer(computerId, computerUserId, scope, user);
    
    return {
      success: true,
      data: null,
      message: 'User dissociated from computer successfully',
    };
  }

  @Get('activity/date-range')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get computers with activity in date range',
    description: 'Retrieve computers that had activity within a specified date range'
  })
  @ApiQuery({ name: 'startDate', required: true, type: String, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: true, type: String, description: 'End date (ISO format)' })
  @ApiResponse({
    status: 200,
    description: 'Computers with activity retrieved successfully',
    type: [ComputerResponseDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  async getComputersWithActivity(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<ComputerResponseDto[]>> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format');
    }

    const computers = await this.computerService.getComputersWithActivity(start, end, scope, user);
    
    return {
      success: true,
      data: computers,
      message: 'Computers with activity retrieved successfully',
    };
  }

  @Put(':id/specifications')
  @Roles('admin', 'hr')
  @ApiOperation({ 
    summary: 'Update computer specifications',
    description: 'Update technical specifications of a computer (OS, IP address, MAC address). Only Admin and HR can perform this action.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Computer ID' })
  @ApiBody({
    description: 'Computer specifications to update',
    schema: {
      type: 'object',
      properties: {
        os: { type: 'string', description: 'Operating system information' },
        ipAddress: { type: 'string', description: 'IP address' },
        macAddress: { type: 'string', description: 'MAC address' }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Computer specifications updated successfully',
    type: ComputerResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Computer not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only Admin and HR can update specifications' })
  async updateComputerSpecifications(
    @Param('id', ParseIntPipe) computerId: number,
    @Body() specifications: { os?: string; ipAddress?: string; macAddress?: string },
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<ComputerResponseDto>> {
    const updatedComputer = await this.computerService.updateComputerSpecifications(
      computerId,
      specifications,
      scope,
      user,
    );
    
    return {
      success: true,
      data: updatedComputer,
      message: 'Computer specifications updated successfully',
    };
  }

  @Put(':id/status')
  @Roles('admin', 'hr')
  @ApiOperation({ 
    summary: 'Update computer status',
    description: 'Update the active status of a computer. Only Admin and HR can perform this action.'
  })
  @ApiParam({ name: 'id', type: Number, description: 'Computer ID' })
  @ApiBody({
    description: 'Computer status',
    schema: {
      type: 'object',
      properties: {
        isActive: { type: 'boolean', description: 'Active status' }
      },
      required: ['isActive']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Computer status updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Computer not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only Admin and HR can update status' })
  async updateComputerStatus(
    @Param('id', ParseIntPipe) computerId: number,
    @Body() statusDto: { isActive: boolean },
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<null>> {
    await this.computerService.updateComputerStatus(computerId, statusDto.isActive);
    
    return {
      success: true,
      data: null,
      message: 'Computer status updated successfully',
    };
  }

  @Get('statistics/overview')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get computers statistics',
    description: 'Retrieve overview statistics for computers within the user\'s scope'
  })
  @ApiResponse({
    status: 200,
    description: 'Computer statistics retrieved successfully',
  })
  async getComputersStatistics(
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<any>> {
    // This would be implemented in the service
    const statistics = {
      totalComputers: 0,
      activeComputers: 0,
      inactiveComputers: 0,
      computersWithUsers: 0,
      computersWithoutUsers: 0,
      operatingSystems: {
        windows: 0,
        linux: 0,
        macos: 0,
        other: 0,
      },
      lastActivitySummary: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
      },
    };
    
    return {
      success: true,
      data: statistics,
      message: 'Computer statistics retrieved successfully',
    };
  }

  @Post('bulk-update-status')
  @Roles('admin', 'hr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Bulk update computer status',
    description: 'Update the status of multiple computers in a single operation. Only Admin and HR can perform this action.'
  })
  @ApiBody({
    description: 'Computer IDs and status to update',
    schema: {
      type: 'object',
      properties: {
        computerIds: {
          type: 'array',
          items: { type: 'number' }
        },
        isActive: { type: 'boolean' }
      },
      required: ['computerIds', 'isActive']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk status update completed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only Admin and HR can perform bulk operations' })
  async bulkUpdateComputerStatus(
    @Body() bulkUpdateDto: { computerIds: number[]; isActive: boolean },
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<any>> {
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const computerId of bulkUpdateDto.computerIds) {
      try {
        await this.computerService.updateComputerStatus(computerId, bulkUpdateDto.isActive);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to update computer ${computerId}: ${error.message}`);
      }
    }
    
    return {
      success: true,
      data: results,
      message: `Bulk status update completed. ${results.successful} successful, ${results.failed} failed.`,
    };
  }

  @Get('health/connectivity')
  @Roles('admin', 'hr')
  @ApiOperation({ 
    summary: 'Get computer connectivity status',
    description: 'Check the connectivity status of computers based on recent activity. Only Admin and HR can access this endpoint.'
  })
  @ApiQuery({ name: 'threshold', required: false, type: Number, description: 'Hours threshold for considering a computer as offline (default: 24)' })
  @ApiResponse({
    status: 200,
    description: 'Computer connectivity status retrieved successfully',
  })
  async getComputerConnectivityStatus(
    @Query('threshold') threshold: number = 24,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<any>> {
    const thresholdDate = new Date(Date.now() - threshold * 60 * 60 * 1000);
    
    // This would be implemented in the service to check recent activity
    const connectivityStatus = {
      online: 0,
      offline: 0,
      unknown: 0,
      lastChecked: new Date(),
      threshold: `${threshold} hours`,
      details: [] as any[],
    };
    
    return {
      success: true,
      data: connectivityStatus,
      message: 'Computer connectivity status retrieved successfully',
    };
  }
}