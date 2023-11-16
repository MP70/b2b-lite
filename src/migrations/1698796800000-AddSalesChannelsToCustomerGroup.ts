import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeSalesChannelRelation1698796800000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop the existing many-to-many join table if it exists
        await queryRunner.query(`
            DROP TABLE IF EXISTS "customer_group_sales_channels"
        `);

        // Add a foreign key column to the 'customer_group' table
        await queryRunner.query(`
            ALTER TABLE "customer_group"
            ADD COLUMN "sales_channel_id" character varying
        `);

        // Add a foreign key constraint to ensure referential integrity
        await queryRunner.query(`
            ALTER TABLE "customer_group"
            ADD CONSTRAINT "fk_sales_channel_id"
            FOREIGN KEY ("sales_channel_id")
            REFERENCES "sales_channel"("id")
            ON DELETE SET NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the foreign key constraint from the 'customer_group' table
        await queryRunner.query(`
            ALTER TABLE "customer_group"
            DROP CONSTRAINT IF EXISTS "fk_sales_channel_id"
        `);

        // Remove the foreign key column from the 'customer_group' table
        await queryRunner.query(`
            ALTER TABLE "customer_group"
            DROP COLUMN IF EXISTS "sales_channel_id"
        `);

        // Recreate the many-to-many join table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "customer_group_sales_channels" (
                "customer_group_id" character varying NOT NULL,
                "sales_channel_id" character varying NOT NULL,
                CONSTRAINT "pk_customer_group_sales_channels" PRIMARY KEY ("customer_group_id", "sales_channel_id")
            )
        `);

        // Recreate the foreign key constraints for the join table
        await queryRunner.query(`
            ALTER TABLE "customer_group_sales_channels"
            ADD CONSTRAINT "fk_customer_group_sales_channels_customer_group_id"
            FOREIGN KEY ("customer_group_id")
            REFERENCES "customer_group"("id")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "customer_group_sales_channels"
            ADD CONSTRAINT "fk_customer_group_sales_channels_sales_channel_id"
            FOREIGN KEY ("sales_channel_id")
            REFERENCES "sales_channel"("id")
            ON DELETE CASCADE
        `);
    }
}
