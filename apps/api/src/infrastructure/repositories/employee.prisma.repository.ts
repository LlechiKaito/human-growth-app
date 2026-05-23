import type { PrismaClient } from '@prisma/client';

import { Employee } from '@/domain/entities/employee.entity';
import type { EmployeeRepository } from '@/domain/repositories/employee.repository';

export class EmployeePrismaRepository implements EmployeeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Employee | null> {
    const row = await this.prisma.employee.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async findByCognitoSub(sub: string): Promise<Employee | null> {
    const row = await this.prisma.employee.findUnique({ where: { cognitoSub: sub } });
    return row ? this.toEntity(row) : null;
  }

  async findByEmail(email: string): Promise<Employee | null> {
    const row = await this.prisma.employee.findUnique({ where: { email } });
    return row ? this.toEntity(row) : null;
  }

  async create(employee: Employee): Promise<Employee> {
    const created = await this.prisma.employee.create({
      data: {
        id: employee.id,
        externalId: employee.externalId,
        cognitoSub: employee.cognitoSub,
        email: employee.email,
        displayName: employee.displayName,
        department: employee.department,
        joinedAt: employee.joinedAt,
      },
    });
    return this.toEntity(created);
  }

  private toEntity(row: {
    id: string;
    externalId: string | null;
    cognitoSub: string;
    email: string;
    displayName: string;
    department: string | null;
    joinedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }): Employee {
    return Employee.create({
      id: row.id,
      externalId: row.externalId,
      cognitoSub: row.cognitoSub,
      email: row.email,
      displayName: row.displayName,
      department: row.department,
      joinedAt: row.joinedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
