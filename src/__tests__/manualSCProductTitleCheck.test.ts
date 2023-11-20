import fetch from "node-fetch";

// Function to obtain store JWT token
async function getStoreJwtToken(): Promise<string> {
  const response = await fetch("http://localhost:9000/store/auth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "b2bcustomer001",
      password: "b2bcustomer001",
    }),
  });

  const data = await response.json();
  return data.access_token; // Replace with actual key if different
}

// Function to obtain admin JWT token
async function getAdminJwtToken(): Promise<string> {
  const response = await fetch("http://localhost:9000/admin/auth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "admin@medusa-test.com",
      password: "supersecret",
    }),
  });

  const data = await response.json();
  return data.access_token;
}

// Function to get the B2B sales channel ID
async function getB2BSalesChannel(apiToken: string): Promise<string> {
  const response = await fetch("http://localhost:9000/admin/sales-channels", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });

  // Check if the response is ok
  if (!response.ok) {
    // If the response is not OK, throw an error with the status text
    throw new Error(
      `HTTP error! status: ${response.status} ${response.statusText}`
    );
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    // If an error occurred while parsing the JSON, throw an error with the response text
    const text = await response.text();
    throw new Error(
      `Failed to parse JSON. Status: ${response.status}, Body: ${text}`
    );
  }

  const b2bChannel = data.sales_channels.find(
    (channel: any) => channel.name === "B2B Sales Channel 001"
  );

  if (!b2bChannel) {
    throw new Error("B2B Sales Channel not found.");
  }

  return b2bChannel.id;
}

// Function to get product titles
async function getProductTitles(
  jwtToken: string,
  salesChannelId: string
): Promise<string[]> {
  const url = new URL("http://localhost:9000/store/products");
  url.searchParams.append("limit", "12");
  url.searchParams.append("offset", "0");
  url.searchParams.append("currency_code", "usd");
  url.searchParams.append("sales_channel_id[]", salesChannelId);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.products.map((product: any) => product.title);
}

// Function to check if product titles start with 'priv'
function checkProductTitles(titles: string[]): void {
  titles.forEach((title) => {
    if (!title.startsWith("priv")) {
      console.warn(
        `Warning: Product title "${title}" does not start with 'priv'`
      );
    } else {
      console.log(title);
    }
  });
}

// Main function to log in, get products, and check titles
async function main() {
  try {
    const adminJwtToken = await getAdminJwtToken();
    const salesChannelId = await getB2BSalesChannel(adminJwtToken);
    const storeJwtToken = await getStoreJwtToken();
    const productTitles = await getProductTitles(storeJwtToken, salesChannelId);
    checkProductTitles(productTitles);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

// Jest test suite
describe("Product Titles", () => {
  it("should warn if product titles do not start with priv", async () => {
    const adminJwtToken = await getAdminJwtToken();
    const salesChannelId = await getB2BSalesChannel(adminJwtToken);
    const storeJwtToken = await getStoreJwtToken();
    const productTitles = await getProductTitles(storeJwtToken, salesChannelId);
    const titlesNotStartingWithPriv = productTitles.filter(
      (title) => !title.startsWith("priv")
    );

    expect(titlesNotStartingWithPriv.length).toBe(0);
  });
});

main();
