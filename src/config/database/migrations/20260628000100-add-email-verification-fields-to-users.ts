import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddEmailVerificationFieldsToUsers20260628000100
  implements MigrationInterface
{
  name = 'AddEmailVerificationFieldsToUsers20260628000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasUsersTable = await queryRunner.hasTable('users');

    if (!hasUsersTable) {
      throw new Error(
        'Table "users" does not exist. This migration expects the base schema to be created already.',
      );
    }

    const hasEmailVerifiedAt = await queryRunner.hasColumn(
      'users',
      'emailVerifiedAt',
    );

    if (!hasEmailVerifiedAt) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'emailVerifiedAt',
          type: 'timestamptz',
          isNullable: true,
        }),
      );
    }

    const hasEmailVerificationDeadlineAt = await queryRunner.hasColumn(
      'users',
      'emailVerificationDeadlineAt',
    );

    if (!hasEmailVerificationDeadlineAt) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'emailVerificationDeadlineAt',
          type: 'timestamptz',
          isNullable: true,
        }),
      );
    }

    await queryRunner.query(`
      UPDATE "users"
      SET "emailVerifiedAt" = COALESCE("createdAt", NOW())
      WHERE "isEmailVerified" = true
        AND "emailVerifiedAt" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "users"
      SET "emailVerificationDeadlineAt" = NOW() + INTERVAL '24 hours'
      WHERE "isEmailVerified" = false
        AND "emailVerificationDeadlineAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasEmailVerificationDeadlineAt = await queryRunner.hasColumn(
      'users',
      'emailVerificationDeadlineAt',
    );

    if (hasEmailVerificationDeadlineAt) {
      await queryRunner.dropColumn('users', 'emailVerificationDeadlineAt');
    }

    const hasEmailVerifiedAt = await queryRunner.hasColumn(
      'users',
      'emailVerifiedAt',
    );

    if (hasEmailVerifiedAt) {
      await queryRunner.dropColumn('users', 'emailVerifiedAt');
    }
  }
}
