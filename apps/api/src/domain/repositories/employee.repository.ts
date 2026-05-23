import type { Employee } from '@/domain/entities/employee.entity';

export interface EmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByCognitoSub(sub: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  create(employee: Employee): Promise<Employee>;
}
