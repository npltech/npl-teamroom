import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { departments, designations, employees } from './schema';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Missing DATABASE_URL. Copy .env.example to .env and fill in your Supabase DB connection string.');
  }

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  console.log('Seeding departments...');
  const insertedDepartments = await db
    .insert(departments)
    .values([
      { name: 'Engineering' },
      { name: 'Sales' },
      { name: 'Finance' },
      { name: 'Marketing' },
      { name: 'Human Resources' },
      { name: 'Design' },
      { name: 'Operations' },
    ])
    .returning();

  const dept = Object.fromEntries(insertedDepartments.map((d) => [d.name, d.id]));

  console.log('Seeding designations...');
  const insertedDesignations = await db
    .insert(designations)
    .values([
      { name: 'Software Engineer', departmentId: dept['Engineering'] },
      { name: 'Senior Software Engineer', departmentId: dept['Engineering'] },
      { name: 'Engineering Manager', departmentId: dept['Engineering'] },
      { name: 'Sales Executive', departmentId: dept['Sales'] },
      { name: 'Sales Manager', departmentId: dept['Sales'] },
      { name: 'HR Executive', departmentId: dept['Human Resources'] },
      { name: 'HR Manager', departmentId: dept['Human Resources'] },
      { name: 'Finance Analyst', departmentId: dept['Finance'] },
      { name: 'Marketing Executive', departmentId: dept['Marketing'] },
      { name: 'Product Designer', departmentId: dept['Design'] },
    ])
    .returning();

  const desig = Object.fromEntries(insertedDesignations.map((d) => [d.name, d.id]));

  console.log('Seeding employees...');
  // Manager (Vikram Joshi) first so later rows can reference his id.
  const [vikram] = await db
    .insert(employees)
    .values({
      employeeCode: 'EMP-1006',
      name: 'Vikram Joshi',
      email: 'vikram.joshi@roster.io',
      phone: '+91 98200 11226',
      departmentId: dept['Engineering'],
      designationId: desig['Engineering Manager'],
      managerId: null,
      joiningDate: '2019-05-18',
      dateOfBirth: '1989-05-05',
      employmentStatus: 'ACTIVE',
      workMode: 'HYBRID',
    })
    .returning();

  await db.insert(employees).values([
    { employeeCode: 'EMP-1001', name: 'Kabir Shah', email: 'kabir.shah@roster.io', phone: '+91 98200 11221', departmentId: dept['Sales'], designationId: desig['Sales Manager'], managerId: null, joiningDate: '2021-03-01', dateOfBirth: '1993-03-12', employmentStatus: 'ACTIVE', workMode: 'OFFICE' },
    { employeeCode: 'EMP-1002', name: 'Meera Nair', email: 'meera.nair@roster.io', phone: '+91 98200 11222', departmentId: dept['Finance'], designationId: desig['Finance Analyst'], managerId: null, joiningDate: '2020-07-14', dateOfBirth: '1995-07-22', employmentStatus: 'ACTIVE', workMode: 'HYBRID' },
    { employeeCode: 'EMP-1003', name: 'Arjun Sinha', email: 'arjun.sinha@roster.io', phone: '+91 98200 11223', departmentId: dept['Engineering'], designationId: desig['Software Engineer'], managerId: vikram.id, joiningDate: '2023-01-09', dateOfBirth: '1998-01-30', employmentStatus: 'ACTIVE', workMode: 'WFH' },
    { employeeCode: 'EMP-1004', name: 'Devika Shetty', email: 'devika.shetty@roster.io', phone: '+91 98200 11224', departmentId: dept['Engineering'], designationId: desig['Software Engineer'], managerId: vikram.id, joiningDate: '2022-11-20', dateOfBirth: '1996-11-02', employmentStatus: 'ACTIVE', workMode: 'OFFICE' },
    { employeeCode: 'EMP-1005', name: 'Imran Qureshi', email: 'imran.qureshi@roster.io', phone: '+91 98200 11225', departmentId: dept['Engineering'], designationId: desig['Senior Software Engineer'], managerId: vikram.id, joiningDate: '2021-09-05', dateOfBirth: '1991-09-16', employmentStatus: 'ACTIVE', workMode: 'WFH' },
    { employeeCode: 'EMP-1007', name: 'Neha Bhatt', email: 'neha.bhatt@roster.io', phone: '+91 98200 11227', departmentId: dept['Engineering'], designationId: desig['Software Engineer'], managerId: vikram.id, joiningDate: '2023-06-12', dateOfBirth: '1994-06-14', employmentStatus: 'ACTIVE', workMode: 'OFFICE' },
    { employeeCode: 'EMP-1008', name: 'Sameer Ali', email: 'sameer.ali@roster.io', phone: '+91 98200 11228', departmentId: dept['Engineering'], designationId: desig['Software Engineer'], managerId: vikram.id, joiningDate: '2024-02-01', dateOfBirth: '1992-02-18', employmentStatus: 'INACTIVE', workMode: 'OFFICE' },
    { employeeCode: 'EMP-1009', name: 'Priya Das', email: 'priya.das@roster.io', phone: '+91 98200 11229', departmentId: dept['Design'], designationId: desig['Product Designer'], managerId: null, joiningDate: '2024-07-22', dateOfBirth: '1997-07-29', employmentStatus: 'ACTIVE', workMode: 'HYBRID' },
    { employeeCode: 'EMP-1010', name: 'Rohan Verma', email: 'rohan.verma@roster.io', phone: '+91 98200 11230', departmentId: dept['Engineering'], designationId: desig['Software Engineer'], managerId: vikram.id, joiningDate: '2024-08-01', dateOfBirth: '1998-08-17', employmentStatus: 'ACTIVE', workMode: 'OFFICE' },
    { employeeCode: 'EMP-1011', name: 'Sana Iqbal', email: 'sana.iqbal@roster.io', phone: '+91 98200 11231', departmentId: dept['Marketing'], designationId: desig['Marketing Executive'], managerId: null, joiningDate: '2024-05-15', dateOfBirth: '1995-05-23', employmentStatus: 'ACTIVE', workMode: 'WFH' },
    { employeeCode: 'EMP-1012', name: 'Anita Rao', email: 'anita.rao@roster.io', phone: '+91 98200 11232', departmentId: dept['Human Resources'], designationId: desig['HR Executive'], managerId: null, joiningDate: '2022-01-10', dateOfBirth: '1990-01-05', employmentStatus: 'ACTIVE', workMode: 'OFFICE' },
  ]);

  console.log('Seed complete.');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
