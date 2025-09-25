import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { 
  IComputerUserService,
  IComputerUser,
  IDataScope,
  IUserContext,
  IComputerUserRegistration
} from '../../../shared/interfaces';
import { QueryDto } from '../../../shared/dto';
import { ComputerUserRepository } from '../repositories/computer-user.repository';
import { ComputerRepository } from '../repositories/computer.repository';
import { LoggerService } from '../../../core/logger/services/logger.service';

@Injectable()
export class ComputerUserService implements IComputerUserService {
  constructor(
    private readonly computerUserRepository: ComputerUserRepository,
    private readonly computerRepository: ComputerRepository,
    private readonly logger: LoggerService,
  ) {}

  async getComputerUsers(query: QueryDto, scope: IDataScope, user: IUserContext): Promise<IComputerUser[]> {
    try {
      this.logger.log('Fetching computer users', {
        userId: user.id,
        scope,
        query,
      });

      const computerUsers = await this.computerUserRepository.findAll(query, scope);

      this.logger.log('Successfully fetched computer users', {
        count: computerUsers.length,
        userId: user.id,
      });

      return computerUsers;
    } catch (error) {
      this.logger.error('Failed to fetch computer users', error, {
        userId: user.id,
        scope,
      });
      throw error;
    }
  }

  async getUnlinkedComputerUsers(scope: IDataScope, user: IUserContext): Promise<IComputerUser[]> {
    try {
      this.logger.log('Fetching unlinked computer users', {
        userId: user.id,
        scope,
      });

      const unlinkedUsers = await this.computerUserRepository.findUnlinked(scope);

      this.logger.log('Successfully fetched unlinked computer users', {
        count: unlinkedUsers.length,
        userId: user.id,
      });

      return unlinkedUsers;
    } catch (error) {
      this.logger.error('Failed to fetch unlinked computer users', error, {
        userId: user.id,
        scope,
      });
      throw error;
    }
  }

  async linkToEmployee(
    computerUserId: number,
    employeeId: number,
    scope: IDataScope,
    user: IUserContext
  ): Promise<void> {
    try {
      this.logger.log('Linking computer user to employee', {
        computerUserId,
        employeeId,
        userId: user.id,
      });

      // Verify computer user exists and is accessible
      const computerUser = await this.computerUserRepository.findById(computerUserId);
      if (!computerUser) {
        throw new NotFoundException('Computer user not found');
      }

      // Check if computer user is already linked
      if (computerUser.employeeId) {
        throw new BadRequestException('Computer user is already linked to an employee');
      }

      // Verify employee exists and is within scope
      await this.validateEmployeeAccess(employeeId, scope, user);

      // Perform the linking
      await this.computerUserRepository.linkToEmployee(computerUserId, employeeId);

      this.logger.log('Successfully linked computer user to employee', {
        computerUserId,
        employeeId,
        userId: user.id,
      });
    } catch (error) {
      this.logger.error('Failed to link computer user to employee', error, {
        computerUserId,
        employeeId,
        userId: user.id,
      });
      throw error;
    }
  }

  async unlinkFromEmployee(
    computerUserId: number,
    scope: IDataScope,
    user: IUserContext
  ): Promise<void> {
    try {
      this.logger.log('Unlinking computer user from employee', {
        computerUserId,
        userId: user.id,
      });

      // Verify computer user exists and is accessible
      const computerUser = await this.computerUserRepository.findById(computerUserId);
      if (!computerUser) {
        throw new NotFoundException('Computer user not found');
      }

      // Check if computer user is linked
      if (!computerUser.employeeId) {
        throw new BadRequestException('Computer user is not linked to any employee');
      }

      // Verify access to the linked employee
      await this.validateEmployeeAccess(computerUser.employeeId, scope, user);

      // Perform the unlinking
      await this.computerUserRepository.unlinkFromEmployee(computerUserId);

      this.logger.log('Successfully unlinked computer user from employee', {
        computerUserId,
        previousEmployeeId: computerUser.employeeId,
        userId: user.id,
      });
    } catch (error) {
      this.logger.error('Failed to unlink computer user from employee', error, {
        computerUserId,
        userId: user.id,
      });
      throw error;
    }
  }

  async registerComputerUser(registrationData: IComputerUserRegistration): Promise<IComputerUser> {
    try {
      this.logger.log('Registering new computer user', {
        computerUid: registrationData.computerUid,
        username: registrationData.username,
        sid: registrationData.sid,
      });

      // Check if computer user already exists
      const existingUser = await this.computerUserRepository.findBySid(registrationData.sid);
      if (existingUser) {
        // Update existing user information
        const updatedUser = await this.computerUserRepository.update(existingUser.id, {
          name: registrationData.name,
          domain: registrationData.domain,
          username: registrationData.username,
          isAdmin: registrationData.isAdmin,
          isInDomain: registrationData.isInDomain,
          isActive: true,
        });

        this.logger.log('Updated existing computer user', {
          computerUserId: updatedUser.id,
          sid: registrationData.sid,
        });

        return updatedUser;
      }

      // Create new computer user
      const newUser = await this.computerUserRepository.create({
        sid: registrationData.sid,
        name: registrationData.name,
        domain: registrationData.domain,
        username: registrationData.username,
        isAdmin: registrationData.isAdmin,
        isInDomain: registrationData.isInDomain,
        isActive: true,
      });

      // Ensure computer exists or create it
      await this.ensureComputerExists(registrationData);

      // Associate user with computer
      const computer = await this.computerRepository.findByUid(registrationData.computerUid);
      if (computer) {
        await this.computerRepository.associateUser(computer.id, newUser.id);
      }

      this.logger.log('Successfully registered new computer user', {
        computerUserId: newUser.id,
        computerUid: registrationData.computerUid,
        username: registrationData.username,
      });

      return newUser;
    } catch (error) {
      this.logger.error('Failed to register computer user', error, {
        computerUid: registrationData.computerUid,
        username: registrationData.username,
      });
      throw error;
    }
  }

  async getComputerUserById(id: number, scope: IDataScope, user: IUserContext): Promise<IComputerUser> {
    try {
      const computerUser = await this.computerUserRepository.findById(id);
      if (!computerUser) {
        throw new NotFoundException('Computer user not found');
      }

      // Verify access based on scope
      await this.validateComputerUserAccess(computerUser, scope, user);

      return computerUser;
    } catch (error) {
      this.logger.error('Failed to get computer user by ID', error, {
        computerUserId: id,
        userId: user.id,
      });
      throw error;
    }
  }

  async searchComputerUsers(
    searchTerm: string,
    scope: IDataScope,
    user: IUserContext
  ): Promise<IComputerUser[]> {
    try {
      const query: QueryDto = {
        search: searchTerm,
        limit: 50,
      };

      return await this.computerUserRepository.findAll(query, scope);
    } catch (error) {
      this.logger.error('Failed to search computer users', error, {
        searchTerm,
        userId: user.id,
      });
      throw error;
    }
  }

  async getComputerUserActivitySummary(
    computerUserId: number,
    startDate: Date,
    endDate: Date,
    scope: IDataScope,
    user: IUserContext
  ): Promise<any> {
    try {
      // Verify computer user exists and is accessible
      const computerUser = await this.computerUserRepository.findById(computerUserId);
      if (!computerUser) {
        throw new NotFoundException('Computer user not found');
      }

      await this.validateComputerUserAccess(computerUser, scope, user);

      // This would typically involve aggregating activity data
      // For now, return basic information
      return {
        computerUserId,
        period: { startDate, endDate },
        summary: {
          totalActiveTime: 0,
          totalSessions: 0,
          topApplications: [],
          topWebsites: [],
        },
      };
    } catch (error) {
      this.logger.error('Failed to get computer user activity summary', error, {
        computerUserId,
        userId: user.id,
      });
      throw error;
    }
  }

  async getComputerUsersByEmployee(
    employeeId: number,
    scope: IDataScope,
    user: IUserContext
  ): Promise<IComputerUser[]> {
    try {
      // Verify employee access
      await this.validateEmployeeAccess(employeeId, scope, user);

      return await this.computerUserRepository.findByEmployeeId(employeeId);
    } catch (error) {
      this.logger.error('Failed to get computer users by employee', error, {
        employeeId,
        userId: user.id,
      });
      throw error;
    }
  }

  private async ensureComputerExists(registrationData: IComputerUserRegistration): Promise<void> {
    const existingComputer = await this.computerRepository.findByUid(registrationData.computerUid);
    
    if (!existingComputer) {
      await this.computerRepository.create({
        computerUid: registrationData.computerUid,
        os: registrationData.os,
        ipAddress: registrationData.ipAddress,
        macAddress: registrationData.macAddress,
        isActive: true,
      });

      this.logger.log('Created new computer during user registration', {
        computerUid: registrationData.computerUid,
      });
    } else if (registrationData.os || registrationData.ipAddress || registrationData.macAddress) {
      // Update computer information if provided
      await this.computerRepository.update(existingComputer.id, {
        os: registrationData.os || existingComputer.os,
        ipAddress: registrationData.ipAddress || existingComputer.ipAddress,
        macAddress: registrationData.macAddress || existingComputer.macAddress,
        isActive: true,
      });

      this.logger.log('Updated computer information during user registration', {
        computerId: existingComputer.id,
        computerUid: registrationData.computerUid,
      });
    }
  }

  private async validateEmployeeAccess(
    employeeId: number,
    scope: IDataScope,
    user: IUserContext
  ): Promise<void> {
    // This would typically involve checking if the employee is within the user's scope
    // For now, we'll implement basic validation
    if (scope.employeeIds && !scope.employeeIds.includes(employeeId)) {
      throw new ForbiddenException('Access denied to this employee');
    }

    // Additional scope validation would be implemented here
    // based on organization and department restrictions
  }

  private async validateComputerUserAccess(
    computerUser: IComputerUser,
    scope: IDataScope,
    user: IUserContext
  ): Promise<void> {
    // If computer user is linked to an employee, validate employee access
    if (computerUser.employeeId) {
      await this.validateEmployeeAccess(computerUser.employeeId, scope, user);
    }

    // Additional validation logic would be implemented here
    // based on organizational scope and user permissions
  }
}