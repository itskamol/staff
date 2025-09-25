import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { DataScope } from '../../../core/auth/decorators/data-scope.decorator';
import { 
  MonitoringQueryDto,
  ActivityQueryDto,
  ActiveWindowResponseDto,
  VisitedSiteResponseDto,
  ScreenshotResponseDto,
  UserSessionResponseDto,
  ActivityReportDto,
  ApiResponseDto
} from '../../../shared/dto';
import { IUserContext, IDataScope } from '../../../shared/interfaces';
import { MonitoringService } from '../services/monitoring.service';
import { ActivityReportService } from '../services/activity-report.service';

@ApiTags('Monitoring')
@ApiBearerAuth()
@Controller('monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly activityReportService: ActivityReportService,
  ) {}

  @Get('active-windows')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get active windows data',
    description: 'Retrieve active window tracking data with role-based filtering and date range support'
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'employeeId', required: false, type: Number, description: 'Filter by employee ID' })
  @ApiQuery({ name: 'computerUserId', required: false, type: Number, description: 'Filter by computer user ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page' })
  @ApiResponse({
    status: 200,
    description: 'Active windows data retrieved successfully',
    type: [ActiveWindowResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getActiveWindows(
    @Query() query: MonitoringQueryDto,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<ActiveWindowResponseDto[]>> {
    this.validateDateRange(query.startDate, query.endDate);
    
    const activeWindows = await this.monitoringService.getActiveWindows(query, scope, user);
    
    return {
      success: true,
      data: activeWindows,
      message: 'Active windows data retrieved successfully',
    };
  }

  @Get('visited-sites')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get visited sites data',
    description: 'Retrieve website visit tracking data with role-based filtering and date range support'
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'employeeId', required: false, type: Number, description: 'Filter by employee ID' })
  @ApiQuery({ name: 'computerUserId', required: false, type: Number, description: 'Filter by computer user ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page' })
  @ApiResponse({
    status: 200,
    description: 'Visited sites data retrieved successfully',
    type: [VisitedSiteResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getVisitedSites(
    @Query() query: MonitoringQueryDto,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<VisitedSiteResponseDto[]>> {
    this.validateDateRange(query.startDate, query.endDate);
    
    const visitedSites = await this.monitoringService.getVisitedSites(query, scope, user);
    
    return {
      success: true,
      data: visitedSites,
      message: 'Visited sites data retrieved successfully',
    };
  }

  @Get('screenshots')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get screenshots data',
    description: 'Retrieve screenshot metadata with privacy controls and role-based filtering'
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'employeeId', required: false, type: Number, description: 'Filter by employee ID' })
  @ApiQuery({ name: 'computerUserId', required: false, type: Number, description: 'Filter by computer user ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page' })
  @ApiResponse({
    status: 200,
    description: 'Screenshots data retrieved successfully',
    type: [ScreenshotResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions or privacy restrictions' })
  async getScreenshots(
    @Query() query: MonitoringQueryDto,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<ScreenshotResponseDto[]>> {
    this.validateDateRange(query.startDate, query.endDate);
    
    const screenshots = await this.monitoringService.getScreenshots(query, scope, user);
    
    return {
      success: true,
      data: screenshots,
      message: 'Screenshots data retrieved successfully',
    };
  }

  @Get('user-sessions')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get user sessions data',
    description: 'Retrieve user session tracking data including login/logout events and session durations'
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'employeeId', required: false, type: Number, description: 'Filter by employee ID' })
  @ApiQuery({ name: 'computerUserId', required: false, type: Number, description: 'Filter by computer user ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page' })
  @ApiResponse({
    status: 200,
    description: 'User sessions data retrieved successfully',
    type: [UserSessionResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getUserSessions(
    @Query() query: MonitoringQueryDto,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<UserSessionResponseDto[]>> {
    this.validateDateRange(query.startDate, query.endDate);
    
    const userSessions = await this.monitoringService.getUserSessions(query, scope, user);
    
    return {
      success: true,
      data: userSessions,
      message: 'User sessions data retrieved successfully',
    };
  }

  @Get('employee/:employeeId/activity')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get employee activity report',
    description: 'Generate comprehensive activity report for a specific employee including productivity metrics and usage patterns'
  })
  @ApiParam({ name: 'employeeId', type: Number, description: 'Employee ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'includeScreenshots', required: false, type: Boolean, description: 'Include screenshot summaries in report' })
  @ApiQuery({ name: 'includeProductivityMetrics', required: false, type: Boolean, description: 'Include detailed productivity analysis' })
  @ApiResponse({
    status: 200,
    description: 'Employee activity report generated successfully',
    type: ActivityReportDto,
  })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied to this employee' })
  async getEmployeeActivityReport(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query() query: ActivityQueryDto,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<ActivityReportDto>> {
    this.validateDateRange(query.startDate, query.endDate);
    
    const activityReport = await this.activityReportService.generateEmployeeActivityReport(
      employeeId,
      query,
      scope,
      user,
    );
    
    return {
      success: true,
      data: activityReport,
      message: 'Employee activity report generated successfully',
    };
  }

  @Get('computer-user/:computerUserId/activity')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get computer user activity report',
    description: 'Generate comprehensive activity report for a specific computer user including productivity metrics and usage patterns'
  })
  @ApiParam({ name: 'computerUserId', type: Number, description: 'Computer User ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'includeScreenshots', required: false, type: Boolean, description: 'Include screenshot summaries in report' })
  @ApiQuery({ name: 'includeProductivityMetrics', required: false, type: Boolean, description: 'Include detailed productivity analysis' })
  @ApiResponse({
    status: 200,
    description: 'Computer user activity report generated successfully',
    type: ActivityReportDto,
  })
  @ApiResponse({ status: 404, description: 'Computer user not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied to this computer user' })
  async getComputerUserActivityReport(
    @Param('computerUserId', ParseIntPipe) computerUserId: number,
    @Query() query: ActivityQueryDto,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<ActivityReportDto>> {
    this.validateDateRange(query.startDate, query.endDate);
    
    const activityReport = await this.activityReportService.generateComputerUserActivityReport(
      computerUserId,
      query,
      scope,
      user,
    );
    
    return {
      success: true,
      data: activityReport,
      message: 'Computer user activity report generated successfully',
    };
  }

  @Get('department/:departmentId/activity')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get department activity report',
    description: 'Generate aggregated activity report for all employees in a department'
  })
  @ApiParam({ name: 'departmentId', type: Number, description: 'Department ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'includeProductivityMetrics', required: false, type: Boolean, description: 'Include detailed productivity analysis' })
  @ApiResponse({
    status: 200,
    description: 'Department activity report generated successfully',
  })
  @ApiResponse({ status: 404, description: 'Department not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Access denied to this department' })
  async getDepartmentActivityReport(
    @Param('departmentId', ParseIntPipe) departmentId: number,
    @Query() query: ActivityQueryDto,
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<any>> {
    this.validateDateRange(query.startDate, query.endDate);
    
    const activityReport = await this.activityReportService.generateDepartmentActivityReport(
      departmentId,
      query,
      scope,
      user,
    );
    
    return {
      success: true,
      data: activityReport,
      message: 'Department activity report generated successfully',
    };
  }

  @Get('summary/productivity')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get productivity summary',
    description: 'Get aggregated productivity metrics for the user\'s scope'
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['employee', 'department', 'day', 'week'], description: 'Group results by' })
  @ApiResponse({
    status: 200,
    description: 'Productivity summary retrieved successfully',
  })
  async getProductivitySummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy: 'employee' | 'department' | 'day' | 'week' = 'employee',
    @DataScope() scope?: IDataScope,
    @CurrentUser() user?: IUserContext,
  ): Promise<ApiResponseDto<any>> {
    this.validateDateRange(startDate, endDate);
    
    // This would be implemented to provide aggregated productivity metrics
    const productivitySummary = {
      period: {
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: endDate || new Date().toISOString(),
      },
      groupBy,
      averageProductivityScore: 0,
      totalActiveTime: 0,
      totalEmployees: 0,
      topPerformers: [],
      productivityTrends: [],
      categoryBreakdown: {
        productive: 0,
        neutral: 0,
        unproductive: 0,
      },
    };
    
    return {
      success: true,
      data: productivitySummary,
      message: 'Productivity summary retrieved successfully',
    };
  }

  @Get('applications/usage')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get application usage statistics',
    description: 'Retrieve statistics about application usage across the user\'s scope'
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of top applications to return' })
  @ApiQuery({ name: 'category', required: false, enum: ['productive', 'neutral', 'unproductive'], description: 'Filter by category' })
  @ApiResponse({
    status: 200,
    description: 'Application usage statistics retrieved successfully',
  })
  async getApplicationUsageStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit: number = 20,
    @Query('category') category?: 'productive' | 'neutral' | 'unproductive',
    @DataScope() scope?: IDataScope,
    @CurrentUser() user?: IUserContext,
  ): Promise<ApiResponseDto<any>> {
    this.validateDateRange(startDate, endDate);
    
    // This would be implemented to provide application usage statistics
    const applicationStats = {
      period: {
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: endDate || new Date().toISOString(),
      },
      totalApplications: 0,
      topApplications: [],
      categoryBreakdown: {
        productive: { count: 0, totalTime: 0 },
        neutral: { count: 0, totalTime: 0 },
        unproductive: { count: 0, totalTime: 0 },
      },
      trends: [],
    };
    
    return {
      success: true,
      data: applicationStats,
      message: 'Application usage statistics retrieved successfully',
    };
  }

  @Get('websites/usage')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get website usage statistics',
    description: 'Retrieve statistics about website usage across the user\'s scope'
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of top websites to return' })
  @ApiQuery({ name: 'category', required: false, enum: ['productive', 'neutral', 'unproductive'], description: 'Filter by category' })
  @ApiResponse({
    status: 200,
    description: 'Website usage statistics retrieved successfully',
  })
  async getWebsiteUsageStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit: number = 20,
    @Query('category') category?: 'productive' | 'neutral' | 'unproductive',
    @DataScope() scope?: IDataScope,
    @CurrentUser() user?: IUserContext,
  ): Promise<ApiResponseDto<any>> {
    this.validateDateRange(startDate, endDate);
    
    // This would be implemented to provide website usage statistics
    const websiteStats = {
      period: {
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: endDate || new Date().toISOString(),
      },
      totalWebsites: 0,
      topWebsites: [],
      categoryBreakdown: {
        productive: { count: 0, totalTime: 0, visits: 0 },
        neutral: { count: 0, totalTime: 0, visits: 0 },
        unproductive: { count: 0, totalTime: 0, visits: 0 },
      },
      trends: [],
    };
    
    return {
      success: true,
      data: websiteStats,
      message: 'Website usage statistics retrieved successfully',
    };
  }

  @Get('sessions/analysis')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get session analysis',
    description: 'Analyze user session patterns and work hours across the user\'s scope'
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'groupBy', required: false, enum: ['employee', 'day', 'week'], description: 'Group results by' })
  @ApiResponse({
    status: 200,
    description: 'Session analysis retrieved successfully',
  })
  async getSessionAnalysis(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy: 'employee' | 'day' | 'week' = 'employee',
    @DataScope() scope?: IDataScope,
    @CurrentUser() user?: IUserContext,
  ): Promise<ApiResponseDto<any>> {
    this.validateDateRange(startDate, endDate);
    
    // This would be implemented to provide session analysis
    const sessionAnalysis = {
      period: {
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: endDate || new Date().toISOString(),
      },
      groupBy,
      totalSessions: 0,
      averageSessionDuration: 0,
      workHoursDistribution: {
        morning: 0,
        afternoon: 0,
        evening: 0,
        night: 0,
      },
      sessionTypes: {
        LOGIN: 0,
        LOGOUT: 0,
        LOCKED: 0,
        UNLOCKED: 0,
      },
      patterns: [],
    };
    
    return {
      success: true,
      data: sessionAnalysis,
      message: 'Session analysis retrieved successfully',
    };
  }

  @Get('real-time/activity')
  @Roles('admin', 'hr', 'department_lead')
  @ApiOperation({ 
    summary: 'Get real-time activity status',
    description: 'Get current activity status of computers and users within the user\'s scope'
  })
  @ApiResponse({
    status: 200,
    description: 'Real-time activity status retrieved successfully',
  })
  async getRealTimeActivity(
    @DataScope() scope: IDataScope,
    @CurrentUser() user: IUserContext,
  ): Promise<ApiResponseDto<any>> {
    // This would be implemented to provide real-time activity status
    const realTimeActivity = {
      timestamp: new Date(),
      activeUsers: 0,
      activeComputers: 0,
      currentSessions: 0,
      recentActivity: [],
      alerts: [],
      systemStatus: 'healthy',
    };
    
    return {
      success: true,
      data: realTimeActivity,
      message: 'Real-time activity status retrieved successfully',
    };
  }

  private validateDateRange(startDate?: string, endDate?: string): void {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequestException('Invalid date format. Use ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)');
      }
      
      if (start >= end) {
        throw new BadRequestException('Start date must be before end date');
      }
      
      // Limit date range to prevent performance issues
      const maxRangeMs = 365 * 24 * 60 * 60 * 1000; // 1 year
      if (end.getTime() - start.getTime() > maxRangeMs) {
        throw new BadRequestException('Date range cannot exceed 1 year');
      }
    }
  }
}