import { ADMINS_GROUP, type MeResponse } from '@/application/dto/auth.dto';
import { ERROR_CODES } from '@/constants/error-codes';
import { DomainError } from '@/domain/errors/domain-errors';
import type { EmployeeRepository } from '@/domain/repositories/employee.repository';

export class GetMeUseCase {
  constructor(private readonly employees: EmployeeRepository) {}

  async execute(cognitoSub: string, groups: string[]): Promise<MeResponse> {
    const employee = await this.employees.findByCognitoSub(cognitoSub);
    if (!employee) {
      throw new DomainError(ERROR_CODES.EMPLOYEE_NOT_FOUND);
    }
    return {
      id: employee.id,
      email: employee.email,
      displayName: employee.displayName,
      department: employee.department,
      isAdmin: groups.includes(ADMINS_GROUP),
    };
  }
}
