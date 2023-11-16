import { dataSource } from "@medusajs/medusa/dist/loaders/database";
import { CustomerGroup } from "../models/CustomerGroup";
import { Brackets } from "typeorm";

const CustomerGroupRepository = dataSource.getRepository(CustomerGroup).extend({
  async findAllSalesChannelsAndApiKeysAccessibleByUserId(
    userId: string,
    implicitAllowChannels: boolean,
    allowB2BtoAccessImplicitAllowedChannels: boolean
  ): Promise<{ salesChannelIds: string[], apiKeys: string[] }> {
    let salesChannelIds: string[] = [];
    let apiKeys: string[] = [];

    // Fetch sales channels and API keys explicitly linked to the user via customer groups
    const explicitAccessResult = await dataSource.createQueryBuilder()
      .select("sc.id", "salesChannelId")
      .addSelect("pak.id", "apiKeyId")
      .from("customer", "c")
      .innerJoin("customer_group_customers", "cgc", "cgc.customer_id = c.id")
      .innerJoin("customer_group", "cg", "cg.id = cgc.customer_group_id")
      .leftJoin("sales_channel", "sc", "sc.id = cg.sales_channel_id AND sc.is_disabled = FALSE AND sc.deleted_at IS NULL")
      .leftJoin("publishable_api_key_sales_channel", "paksc", "paksc.sales_channel_id = sc.id")
      .leftJoin("publishable_api_key", "pak", "pak.id = paksc.publishable_key_id AND pak.revoked_at IS NULL AND pak.revoked_by IS NULL")
      .where("c.id = :userId", { userId })
      .andWhere("cg.deleted_at IS NULL")
      .getRawMany();

    // Process the results to extract unique IDs
    salesChannelIds = [...new Set(explicitAccessResult.map(item => item.salesChannelId).filter(Boolean))];
    apiKeys = [...new Set(explicitAccessResult.map(item => item.apiKeyId).filter(Boolean))];

    // If implicit access is allowed and the user has no explicit sales channels,
    // or if allowB2BtoAccessImplicitAllowedChannels is true, include implicit sales channels and API keys
    if (implicitAllowChannels && (salesChannelIds.length === 0 || allowB2BtoAccessImplicitAllowedChannels)) {
      const implicitAccessResult = await this.fetchImplicitSalesChannelsAndApiKeys();
      salesChannelIds = [...new Set([...salesChannelIds, ...implicitAccessResult.salesChannelIds])];
      apiKeys = [...new Set([...apiKeys, ...implicitAccessResult.apiKeys])];
    }

    return {
      salesChannelIds,
      apiKeys
    };
  },


  async findSalesChannelsByApiKey(
    userId: string,
    providedApiKey: string | null,
    implicitAllowChannels: boolean,
    allowB2BtoAccessImplicitAllowedChannels: boolean,
    limitImplictsIfApiKey: boolean
  ): Promise<{ salesChannelIds: string[] }> {
    let salesChannelIds: string[] = [];

    // Fetch sales channels explicitly linked to the user via customer groups
    let explicitQueryBuilder = dataSource.createQueryBuilder()
      .select("sc.id", "salesChannelId")
      .from("sales_channel", "sc")
      .innerJoin("customer_group", "cg", "cg.sales_channel_id = sc.id")
      .innerJoin("customer_group_customers", "cgc", "cgc.customer_group_id = cg.id")
      .where("cgc.customer_id = :userId", { userId })
      .andWhere("sc.is_disabled = FALSE")
      .andWhere("sc.deleted_at IS NULL")
      .andWhere("cg.deleted_at IS NULL");

    // If an API key is provided, filter by it
    if (providedApiKey) {
      explicitQueryBuilder
        .innerJoin("publishable_api_key_sales_channel", "paksc", "paksc.sales_channel_id = sc.id")
        .innerJoin("publishable_api_key", "pak", "pak.id = paksc.publishable_api_key_id")
        .andWhere("pak.api_key = :providedApiKey", { providedApiKey })
        .andWhere("pak.revoked_at IS NULL")
        .andWhere("pak.revoked_by IS NULL");
    }

    // Get explicit access results
    const explicitAccessResult = await explicitQueryBuilder.getRawMany();
    salesChannelIds = explicitAccessResult.map(item => item.salesChannelId).filter(Boolean);

    // Check for implicit channel access
    if (implicitAllowChannels || allowB2BtoAccessImplicitAllowedChannels) {
      let implicitQueryBuilder = dataSource.createQueryBuilder()
        .select("sc.id", "salesChannelId")
        .from("sales_channel", "sc")
        .where("sc.is_disabled = FALSE")
        .andWhere("sc.deleted_at IS NULL")
        .andWhere(new Brackets(qb => {
          qb.where("NOT EXISTS (SELECT 1 FROM customer_group WHERE sales_channel_id = sc.id)")
            .orWhere("cgc.customer_id = :userId", { userId });
        }));

      // If an API key is provided and we are limiting implicit channels by the API key
      if (providedApiKey && limitImplictsIfApiKey) {
        implicitQueryBuilder
          .innerJoin("publishable_api_key_sales_channel", "paksc", "paksc.sales_channel_id = sc.id")
          .innerJoin("publishable_api_key", "pak", "pak.id = paksc.publishable_api_key_id")
          .andWhere("pak.api_key = :providedApiKey", { providedApiKey })
          .andWhere("pak.revoked_at IS NULL")
          .andWhere("pak.revoked_by IS NULL");
      }

      // Execute the implicit access query
      const implicitAccessResult = await implicitQueryBuilder.getRawMany();
      const implicitSalesChannelIds = implicitAccessResult.map(item => item.salesChannelId).filter(Boolean);

      // Combine explicit and implicit sales channel IDs, removing duplicates
      salesChannelIds = [...new Set([...salesChannelIds, ...implicitSalesChannelIds])];
    }

    return { salesChannelIds };
  },
  async getAllAllowedSalesChannelsLimitedToApiKey(
    userId?: string,
    providedApiKey?: string,
    implicitAllowChannels: boolean = true,
    allowB2BtoAccessImplicitAllowedChannels: boolean = true
  ): Promise<{ salesChannelIds: string[] }> {
    let salesChannelIds: string[] = [];

    // Query for explicit access to sales channels if userId is provided
    if (userId) {
      let explicitQueryBuilder = dataSource.createQueryBuilder()
        .select("sc.id", "salesChannelId")
        .from("sales_channel", "sc")
        .innerJoin("customer_group", "cg", "cg.sales_channel_id = sc.id")
        .innerJoin("customer_group_customers", "cgc", "cgc.customer_group_id = cg.id AND cgc.customer_id = :userId", { userId })
        .where("sc.is_disabled = FALSE")
        .andWhere("sc.deleted_at IS NULL")
        .andWhere("cg.deleted_at IS NULL");

      // Modify the query to filter by the provided API key if given
      if (providedApiKey) {
        explicitQueryBuilder
          .innerJoin("publishable_api_key_sales_channel", "paksc", "paksc.sales_channel_id = sc.id")
          .innerJoin("publishable_api_key", "pak", "pak.id = paksc.publishable_api_key_id AND pak.api_key = :providedApiKey", { providedApiKey })
          .andWhere("pak.revoked_at IS NULL")
          .andWhere("pak.revoked_by IS NULL");
      }

      // Execute the explicit access query and collect the results
      const explicitAccessResult = await explicitQueryBuilder.getRawMany();
      salesChannelIds = explicitAccessResult.map(item => item.salesChannelId).filter(Boolean);
    }

    // If implicit access is allowed, query for implicit sales channels
    if (implicitAllowChannels) {
      let implicitQueryBuilder = dataSource.createQueryBuilder()
        .select("sc.id", "salesChannelId")
        .from("sales_channel", "sc")
        .where("sc.is_disabled = FALSE")
        .andWhere("sc.deleted_at IS NULL")
        .andWhere(new Brackets(qb => {
          qb.where("NOT EXISTS (SELECT 1 FROM customer_group WHERE sales_channel_id = sc.id)");
        }));

      // If a provided API key should limit implicit channels, adjust the query accordingly
      if (providedApiKey && !allowB2BtoAccessImplicitAllowedChannels) {
        implicitQueryBuilder
          .innerJoin("publishable_api_key_sales_channel", "paksc", "paksc.sales_channel_id = sc.id")
          .innerJoin("publishable_api_key", "pak", "pak.id = paksc.publishable_api_key_id AND pak.api_key = :providedApiKey", { providedApiKey })
          .andWhere("pak.revoked_at IS NULL")
          .andWhere("pak.revoked_by IS NULL");
      }

      // Execute the implicit access query and collect the results
      const implicitAccessResult = await implicitQueryBuilder.getRawMany();
      const implicitSalesChannelIds = implicitAccessResult.map(item => item.salesChannelId).filter(Boolean);

      // Merge explicit and implicit sales channel IDs, removing duplicates
      salesChannelIds = [...new Set([...salesChannelIds, ...implicitSalesChannelIds])];
    }

    // Ensure no falsey sales channel IDs are returned
    salesChannelIds = salesChannelIds.filter(Boolean);

    return { salesChannelIds };
  },


});

export default CustomerGroupRepository;
