import { parse } from "yaml";
import { createClient } from "@libsql/client";

function getClient() {
  const luvaEnvRaw = process.env.luva
  if (!luvaEnvRaw) {
    return createClient({
      url: "http://127.0.0.1:8080",
    })
  } else {
    const luvaEnv = JSON.parse(luvaEnvRaw)
    return createClient({
      url: `libsql://${luvaEnv.services.maindb.databaseHostname}`,
      authToken: luvaEnv.services.maindb.databaseApiToken,
    })
  }
}

async function getConfig(): Promise<{
    githubRepository: string | null;
    githubToken: string | null;
}> {

  const turso = getClient();
  await turso.execute(
    "CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY UNIQUE, value TEXT)",
  );

  const result = await turso.execute("SELECT * FROM config");
  const githubRepository = result.rows.find(row => row['key'] === 'githubRepository')?.value as string | null;
  const githubToken = result.rows.find(row => row['key'] === 'githubToken')?.value as string | null;

  return {
    githubRepository,
    githubToken,
  }
}

async function setConfigValue(key: string, value: string) {
  const turso = getClient();
  await turso.execute(
    "INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)",
    [key, value],
  );
}

export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    try {
      const config = await getConfig();
      const pathname = url.pathname;

      if (pathname === "/setup") {
        return await getSetupResponse(request, config);
      }
      return await getDecapResponse(request, config);
    } catch (error) {
      console.error('Unhandled error', error);

      const errorMessage =
        error instanceof AppError
          ? error.message
          : "Something went wrong when loading decap. Please check the config values and try again.";

      if (url.pathname === "/setup") {
        return new Response(errorMessage, { status: 500 });
      }

      return Response.redirect(
        `${url.origin}/setup?error=${encodeURIComponent(errorMessage)}`,
        302
      );
    }
  },
};

async function getSetupResponse(request: Request, config: any) {
  if (request.method === "GET") {
    return new Response(getSetupHtml(request), {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } else if (request.method === "POST") {
    const formData = await request.formData();
    let githubRepository = formData.get("githubRepository") as string;
    const githubToken = formData.get("githubToken") as string;

    if (!githubRepository || !githubToken) {
      throw new AppError("Invalid github repository or token");
    }

    if (!githubRepository.startsWith("https://github.com/")) {
      githubRepository = githubRepository.replace("https://github.com/", "");
    }

    await setConfigValue("githubRepository", githubRepository);
    await setConfigValue("githubToken", githubToken);

    const url = new URL(request.url);
    url.pathname = "/";
    return Response.redirect(url.toString());
  }
}

async function getDecapResponse(request: Request, config: any) {
  const githubRepository = config.githubRepository;
  const githubToken = config.githubToken;

  if (!githubRepository || !githubToken) {
    const url = new URL(request.url);
    url.pathname = "/setup";
    return Response.redirect(url.toString(), 303);
  }

  let decapJsonConfig = await getDecapConfig(githubRepository, githubToken);

  const html = /*html*/ `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta name="robots" content="noindex" />
          <title>Decap CMS</title>
      </head>
      <body>
        <script>
          window.DECAP_CONFIG = ${JSON.stringify(decapJsonConfig)}
          window.CMS_MANUAL_INIT = true
        </script>
        <script src="https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js"></script>
        <script src="/client.js"></script>
      </body>
      </html>
      `;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
    },
  });
}

class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}

async function getDecapConfig(
  githubRepositoryUrl: string,
  githubToken: string
) {
  const decapConfigFilename = "decapconfig.yml";
  const content = await fetchGithubFileContent(
    githubRepositoryUrl,
    githubToken,
    decapConfigFilename
  );
  const decapJsonConfig = { ...parse(content) };

  if (!decapJsonConfig.collections) {
    throw new AppError("No backend found in decapconfig.yml");
  }

  if (!decapJsonConfig.backend) {
    decapJsonConfig.backend = {};
  }

  decapJsonConfig.backend.name = "luva";
  decapJsonConfig.backend.repo = githubRepositoryUrl;
  decapJsonConfig.load_config_file = false;
  decapJsonConfig.githubToken = githubToken;

  return decapJsonConfig;
}

async function fetchGithubFileContent(
  githubRepositoryUrl: string,
  githubToken: string,
  filename: string
) {
  console.log(`Fetching ${filename} from GitHub`, githubRepositoryUrl, githubToken);
  const [owner, repo] = githubRepositoryUrl
    .split("/")
    .filter(Boolean)
    .slice(-2);
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filename}`;

  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github.v3.raw",
      "User-Agent": "Luvabase Decap CMS",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Error fetching ${filename} from GitHub`, text, response.status, response.statusText);
    throw new AppError(
      `Could not fetch ${filename} from GitHub. Please check the repository URL and token and try again.`
    );
  }
  const text = await response.text();

  console.log(`Fetched`, filename);
  return text;
}

function getSetupHtml(request: Request) {
  const url = new URL(request.url);
  const errorMessage = url.searchParams.get("error");

  return /*html*/ `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>Setup Decap CMS</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/water.css">
  </head>
  <body>
    <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 600px; margin: 0 auto; padding: 2rem;">
    ${
      errorMessage
        ? `
    <div style="background-color: #fee; border: 1px solid #fcc; padding: 1rem; border-radius: 0.5rem;">
      <h3 style="margin: 0;">Oops!</h3>
      <p>${errorMessage}</p>
    </div>
    `
        : ""
    }
      <h1 style="margin-bottom: 0;">Setup Decap CMS</h1>
      <p style="margin-top: 0;">
        Before you continue you need a website in a GitHub repository that preferably deploys when new commits are pushed. You can check <a href="https://github.com/simonbengtsson/luva-decap-vitepress?tab=readme-ov-file#vitepress-with-decap-cms-as-luva-app" target="_blank">this README</a> for example instructions.
      </p>
      <form method="POST">
      <div>
        <label for="githubRepository"><strong>GitHub Repository URL</strong></label><br>
        <input style="width: 100%;" type="text" name="githubRepository" required />
        <p>
          Full URL to the public or private repository of your website. There should be a <code>decapconfig.yml</code> file at the root, but no decap <code>/admin</code> folder is needed.
        </p>
      </div>
      <br>
      <div>
        <label for="githubToken"><strong>GitHub Personal Token</strong></label><br>
        <input style="width: 100%;" type="text" name="githubToken" required />
        <p>
          The only permission required is the "Contents" permission under "Repository permissions". You can create a new token on the <a href="https://github.com/settings/personal-access-tokens/new" target="_blank">create new token</a> page.
        </p>
      </div>
      <br>
      <button type="submit">Open Decap CMS</button>
      <p>If you want to update these settings later you can go back to <a href="/setup">/setup</a>.</p>
      </form>
    </div>
  </body>
  </html>
  `;
}
