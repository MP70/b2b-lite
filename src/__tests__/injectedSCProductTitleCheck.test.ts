import fetch from "node-fetch";

// Function to obtain JWT token
async function getJwtToken(
  username: string,
  password: string
): Promise<string> {
  const response = await fetch("http://localhost:9000/store/auth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: username,
      password: password,
    }),
  });

  const data = await response.json();
  return data.access_token;
}

// Function to get the list of products
async function getProductTitles(jwtToken: string): Promise<string[]> {
  const response = await fetch(
    "http://localhost:9000/store/products?limit=12&offset=0&currency_code=usd",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        "Cache-Control": "no-cache",
      },
    }
  );

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
    }
  });
}

// Main function to log in, get products, and check titles
async function main() {
  const username = "b2bcustomer001";
  const password = "b2bcustomer001";
  try {
    const jwtToken = await getJwtToken(username, password);
    const productTitles = await getProductTitles(jwtToken);
    checkProductTitles(productTitles);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

// Jest test suite
describe("Product Titles", () => {
  it("should warn if product titles do not start with priv", async () => {
    const jwtToken = await getJwtToken("b2bcustomer001", "b2bcustomer001");
    const productTitles = await getProductTitles(jwtToken);
    const titlesNotStartingWithPriv = productTitles.filter(
      (title) => !title.startsWith("priv")
    );

    expect(titlesNotStartingWithPriv.length).toBe(0);
  });
});

main();
