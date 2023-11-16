import {
  authenticateCustomer,
  requireCustomerAuthentication,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
  type MiddlewaresConfig,
} from "@medusajs/medusa";
import { extendRequestParams } from "@medusajs/medusa/dist/api/middlewares/publishable-api-key/extend-request-params";
import { validateSalesChannelParam } from "@medusajs/medusa/dist/api/middlewares/publishable-api-key/validate-sales-channel-param";
import { withDefaultSalesChannel} from "@medusajs/medusa/dist/api/middlewares/with-default-sales-channel";
import { FlagRouter } from "@medusajs/utils"
import SalesChannelFeatureFlag from "@medusajs/medusa/dist/loaders/feature-flags/sales-channels"
 import IsolateProductDomain from "@medusajs/medusa/dist/loaders/feature-flags/isolate-product-domain"


import CustomerGroupRepository from '../repositories/CustomerGroup'
import { NextFunction } from "express";

/**
 * Middleware that filters user sales channels based on their access rights.
 * @param salesChannelAsArray - Determines whether to set sales_channel_id as an array or a single value.
 * @returns The middleware function.
 */
const filterUserSalesChannels = (salesChannelAsArray: boolean) => async (
  req: MedusaRequest & { publishableApiKeyScopes: any }, 
  res: MedusaResponse, 
  next: MedusaNextFunction
): Promise<void> => {
  const userId = req.user?.customer_id;
  const providedApiKey = req.get("x-publishable-api-key");
  const featureFlagRouter = req.scope.resolve(
    "featureFlagRouter"
  )
  console.log("SALES attached", featureFlagRouter.isFeatureEnabled(SalesChannelFeatureFlag.key))
  console.log("SALES attached", featureFlagRouter.isFeatureEnabled(IsolateProductDomain.key))

  if (providedApiKey) {
    /* req.publishableApiKeyScopes = await publishableKeyService.getResourceScopes(
      pubKey
    ) */
    const scopes = req.publishableApiKeyScopes
  console.log("FOUND", scopes)    
  }
  console.log(req.body)
  console.log(req.query.sales_channel_id)

  try {
    const salesChannels = await CustomerGroupRepository.getAllAllowedSalesChannelsLimitedToApiKey(
      userId,
      providedApiKey,
      false,
      false,
    );

    const accessibleSalesChannelIds = salesChannels.salesChannelIds;
    let requestedSalesChannelIds = (req.body?.sales_channel_id ?? req.query.sales_channel_id) as string | string[];
    requestedSalesChannelIds = Array.isArray(requestedSalesChannelIds) ? requestedSalesChannelIds : [requestedSalesChannelIds];

    const isRequestedIdPermitted = (id: string) => accessibleSalesChannelIds.includes(id);
    const allRequestedArePermitted = requestedSalesChannelIds.every(isRequestedIdPermitted);

    const filteredSalesChannelIds = allRequestedArePermitted
      ? requestedSalesChannelIds
      : salesChannelAsArray
        ? accessibleSalesChannelIds
        : [accessibleSalesChannelIds[0]];

    // Update the request with the filtered sales channel IDs
    req.publishableApiKeyScopes = { sales_channel_ids: ['sc_01HEQTJCFXYR468EJJT2YB4AT7'] }
    console.log("FOUNDv2", req.publishableApiKeyScopes )   
    if(req.publishableApiKeyScopes?.sales_channel_ids.length) {
console.log("OHFUCK",req.publishableApiKeyScopes?.sales_channel_ids)}
      if (req.body) {
      //req.body.sales_channel_id = salesChannelAsArray ? filteredSalesChannelIds : filteredSalesChannelIds[0];
      console.log("set", salesChannelAsArray ? filteredSalesChannelIds : filteredSalesChannelIds[0])
      console.log(salesChannelAsArray, "sales ")
    } else {
      req.query.sales_channel_id = ['oop'];

    }
    console.log("Before setting SchanID", req.query)
    req.query.sales_channel_id = ['sc_01HEQTJCFXYR468EJJT2YB4AT7'];
    console.log("After setting SchanID", req.query)
    next();
  } catch (error) {
    console.error(`Error while filtering sales channels for user ${userId}: ${error.message}`, error);
    res.status(500).json({ message: "Internal server error while filtering sales channels" });
  }
};

// Configuration for the routes, using a closure to pass the salesChannelAsArray flag
export const config: MiddlewaresConfig = {
  routes: [
    {
      matcher: "/store/collections",
      middlewares: [authenticateCustomer()],
    },
    {
      matcher: "/store/product-categories",
      middlewares: [authenticateCustomer() ],
    },
    {
      matcher: "/store/regions",
      middlewares: [authenticateCustomer()],
    },
     {
      matcher: "/store/products",
      middlewares: [authenticateCustomer(), filterUserSalesChannels(true)],
    }, 
/*    {
      matcher: "/store/carts",
      middlewares: [authenticateCustomer()],
    }, */
  ],
};
