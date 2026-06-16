import { mkdirSync, renameSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { chromium, type BrowserContext, type Page } from "playwright";

loadEnv({ path: ".env.marketing.local", override: false });
loadEnv({ override: false });

const DEFAULT_BASE_URL = "http://127.0.0.1:3002";
const baseUrl = (process.env.WILDTRACK360_SCREENSHOT_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
const outputDir = path.resolve(
  process.env.WILDTRACK360_CLIPS_OUTPUT_DIR ??
    path.resolve(process.cwd(), "marketing/video/public/clips"),
);

const VIEWPORT = { width: 1160, height: 1360 };

type Clip = {
  name: string;
  path: string;
  waitFor: string | RegExp;
  action: (page: Page) => Promise<void>;
};

async function settle(page: Page, ms: number) {
  await page.waitForTimeout(ms);
}

async function applyCleanup(page: Page) {
  await page.evaluate(() => {
    document.documentElement.classList.add("wildtrack360-screenshot-mode");
    if (!document.querySelector("[data-wildtrack360-screenshot-cleanup]")) {
      const style = document.createElement("style");
      style.setAttribute("data-wildtrack360-screenshot-cleanup", "true");
      style.textContent = `
        nextjs-portal,
        next-route-announcer,
        [data-nextjs-toast],
        [data-nextjs-dialog-overlay],
        [data-nextjs-dialog],
        [data-nextjs-dev-tools-button],
        [data-nextjs-dev-tools-indicator] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
        html { scrollbar-width: none; }
        ::-webkit-scrollbar { display: none; }
      `;
      document.head.appendChild(style);
    }
    document.querySelectorAll("nextjs-portal").forEach((node) => node.remove());
  });
}

function initScript() {
  return `
    (() => {
      globalThis.__name = (fn) => fn;
      window.Clerk = {
        organization: {
          name: "Illawarra Wildlife Rescue",
          publicMetadata: { jurisdiction: "NSW" }
        }
      };
      try {
        window.localStorage.removeItem("dashboard:cardHidden");
        window.localStorage.removeItem("dashboard:cardOrder");
      } catch {}
    })();
  `;
}

async function smoothScroll(page: Page, totalPx: number, durationMs: number) {
  await page.evaluate(
    ({ totalPx, durationMs }) =>
      new Promise<void>((resolve) => {
        const candidates = [
          document.scrollingElement,
          document.documentElement,
          document.body,
          ...Array.from(document.querySelectorAll<HTMLElement>("main, [data-radix-scroll-area-viewport], .overflow-y-auto")),
        ].filter(Boolean) as HTMLElement[];
        const scroller =
          candidates
            .map((element) => ({
              element,
              capacity: Math.max(0, element.scrollHeight - element.clientHeight),
              area: element.clientWidth * element.clientHeight,
            }))
            .filter((item) => item.capacity > 24)
            .sort((a, b) => b.capacity * b.area - a.capacity * a.area)[0]?.element ??
          document.scrollingElement ??
          document.documentElement;

        const isDocument =
          scroller === document.scrollingElement ||
          scroller === document.documentElement ||
          scroller === document.body;
        const startY = isDocument ? window.scrollY : scroller.scrollTop;
        const maxY = isDocument
          ? Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
          : Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        const targetY = Math.max(0, Math.min(maxY, startY + totalPx));
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / durationMs);
          const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          const nextY = startY + (targetY - startY) * eased;
          if (isDocument) window.scrollTo(0, nextY);
          else scroller.scrollTop = nextY;
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      }),
    { totalPx, durationMs },
  );
}

async function clickIfVisible(page: Page, name: string | RegExp) {
  await page.getByRole("button", { name }).first().click({ timeout: 2500 }).catch(() => null);
}

async function openAnimalTab(page: Page, name: string | RegExp) {
  await page.getByRole("tab", { name }).click({ timeout: 3000 }).catch(() => null);
  await settle(page, 1200);
}

const clips: Clip[] = [
  {
    name: "dashboard",
    path: "/",
    waitFor: "Compliance Readiness Checklist",
    action: async (page) => {
      await settle(page, 1200);
      await smoothScroll(page, 900, 2600);
      await settle(page, 900);
      await smoothScroll(page, 1200, 3000);
      await settle(page, 1200);
    },
  },
  {
    name: "dashboard-widgets",
    path: "/",
    waitFor: "Dashboard widgets",
    action: async (page) => {
      await settle(page, 1000);
      await smoothScroll(page, 1450, 3000);
      await settle(page, 900);
      await smoothScroll(page, 1350, 3000);
      await settle(page, 1400);
    },
  },
  {
    name: "animals",
    path: "/animals",
    waitFor: "All Animal Records",
    action: async (page) => {
      await settle(page, 1200);
      await page.getByPlaceholder("Search animals...").fill("Luna");
      await settle(page, 1400);
      await page.getByPlaceholder("Search animals...").fill("");
      await settle(page, 700);
      await smoothScroll(page, 450, 2200);
      await settle(page, 1200);
    },
  },
  {
    name: "animal-detail",
    path: "/animals/animal-luna",
    waitFor: "NSW Compliance Data",
    action: async (page) => {
      await settle(page, 1200);
      await smoothScroll(page, 700, 2600);
      await settle(page, 900);
      await openAnimalTab(page, "Timeline");
      await smoothScroll(page, 520, 2200);
      await settle(page, 1200);
    },
  },
  {
    name: "animal-growth",
    path: "/animals/animal-luna",
    waitFor: "Care Records",
    action: async (page) => {
      await settle(page, 1000);
      await openAnimalTab(page, "Growth");
      await smoothScroll(page, 700, 2500);
      await settle(page, 1400);
    },
  },
  {
    name: "compliance",
    path: "/compliance",
    waitFor: "Compliance Management",
    action: async (page) => {
      await settle(page, 1200);
      await smoothScroll(page, 600, 2400);
      await settle(page, 1300);
    },
  },
  {
    name: "compliance-overview",
    path: "/compliance/overview",
    waitFor: "Compliance Overview",
    action: async (page) => {
      await settle(page, 1200);
      await smoothScroll(page, 500, 2300);
      await settle(page, 1300);
    },
  },
  {
    name: "register",
    path: "/compliance/register",
    waitFor: "NSW Wildlife Admission",
    action: async (page) => {
      await settle(page, 1200);
      await page.getByPlaceholder("Search by name, species, or ID...").fill("flying");
      await settle(page, 1200);
      await page.getByPlaceholder("Search by name, species, or ID...").fill("");
      await settle(page, 600);
      await smoothScroll(page, 600, 2400);
      await settle(page, 1400);
    },
  },
  {
    name: "call-logs",
    path: "/compliance/call-logs",
    waitFor: "Complete log of all incoming",
    action: async (page) => {
      await settle(page, 1300);
      await smoothScroll(page, 400, 2000);
      await settle(page, 1200);
    },
  },
  {
    name: "carers",
    path: "/compliance/carers",
    waitFor: "Carer Licence & CPD Tracker",
    action: async (page) => {
      await settle(page, 1300);
      await smoothScroll(page, 620, 2400);
      await settle(page, 1300);
    },
  },
  {
    name: "training",
    path: "/compliance/carers/training",
    waitFor: "Training Certificates Management",
    action: async (page) => {
      await settle(page, 1200);
      await clickIfVisible(page, /All Status/i);
      await settle(page, 700);
      await page.keyboard.press("Escape").catch(() => null);
      await smoothScroll(page, 480, 2200);
      await settle(page, 1200);
    },
  },
  {
    name: "release-checklist",
    path: "/compliance/release-checklist",
    waitFor: "Pre-Release Checklist",
    action: async (page) => {
      await settle(page, 1200);
      await smoothScroll(page, 520, 2300);
      await settle(page, 1400);
    },
  },
  {
    name: "nsw-report",
    path: "/compliance/nsw-report",
    waitFor: "NSW Annual Report Generator",
    action: async (page) => {
      await settle(page, 1500);
      await page.getByLabel("Organization Name *").fill("Illawarra Wildlife Rescue").catch(() => null);
      await page.getByLabel("License Number *").fill("MWL000789").catch(() => null);
      await page.getByLabel("Contact Name *").fill("Amelia Hart").catch(() => null);
      await settle(page, 900);
      await smoothScroll(page, 720, 2600);
      await settle(page, 1400);
    },
  },
  {
    name: "tools",
    path: "/tools",
    waitFor: "Care Tools",
    action: async (page) => {
      await settle(page, 1200);
      await smoothScroll(page, 360, 2000);
      await settle(page, 1200);
    },
  },
  {
    name: "custom-reporting",
    path: "/tools/reporting",
    waitFor: "Query workbench",
    action: async (page) => {
      await settle(page, 1200);
      await page.getByRole("button", { name: /Preview/i }).click();
      await page.getByText("Chart (bar)", { exact: false }).first().waitFor({ timeout: 20000 }).catch(() => null);
      await settle(page, 1000);
      await smoothScroll(page, 620, 2400);
      await settle(page, 1300);
    },
  },
  {
    name: "feed-roster",
    path: "/tools/feed-roster",
    waitFor: "Daily Schedule",
    action: async (page) => {
      await settle(page, 1200);
      await smoothScroll(page, 420, 2200);
      await settle(page, 1300);
    },
  },
  {
    name: "flying-fox-calculator",
    path: "/tools/feed-calculator/flying-fox",
    waitFor: "Pup Details",
    action: async (page) => {
      await settle(page, 1000);
      await page.getByLabel("Age in days").fill("28");
      await page.getByText("Feed Plan", { exact: false }).first().waitFor({ timeout: 5000 });
      await settle(page, 1300);
      await smoothScroll(page, 360, 1900);
      await settle(page, 1200);
    },
  },
  {
    name: "macropod-calculator",
    path: "/tools/feed-calculator/macropod",
    waitFor: "Joey Details",
    action: async (page) => {
      await settle(page, 1000);
      await page.getByLabel("Weight (g)").fill("1850");
      await page.getByLabel(/Age.*optional/).fill("210");
      await page.getByText("Feed Plan", { exact: false }).first().waitFor({ timeout: 5000 });
      await settle(page, 1300);
      await smoothScroll(page, 360, 1900);
      await settle(page, 1200);
    },
  },
  {
    name: "admin",
    path: "/admin",
    waitFor: "Admin Panel",
    action: async (page) => {
      await settle(page, 1600);
      await smoothScroll(page, 480, 2200);
      await settle(page, 1300);
    },
  },
  {
    name: "admin-people",
    path: "/admin",
    waitFor: "Manage People",
    action: async (page) => {
      await settle(page, 1800);
      await page.getByRole("tab", { name: "People" }).click();
      await page.getByText("Organisation Members", { exact: false }).first().waitFor({ timeout: 30000 });
      await smoothScroll(page, 460, 2200);
      await settle(page, 3600);
    },
  },
  {
    name: "admin-assets",
    path: "/admin",
    waitFor: "Assets",
    action: async (page) => {
      await settle(page, 1800);
      await page.getByRole("tab", { name: "Assets" }).click();
      await page.getByText("Asset List", { exact: false }).first().waitFor({ timeout: 30000 });
      await smoothScroll(page, 460, 2200);
      await settle(page, 3600);
    },
  },
  {
    name: "admin-audit",
    path: "/admin",
    waitFor: "Audit Log",
    action: async (page) => {
      await settle(page, 1800);
      await page.getByRole("button", { name: /Admin Options/i }).click();
      await page.getByRole("menuitem", { name: /Audit Log/i }).click();
      await page.getByText("Immutable record", { exact: false }).first().waitFor({ timeout: 30000 });
      await smoothScroll(page, 460, 2200);
      await settle(page, 3600);
    },
  },
  {
    name: "members",
    path: "/admin/members",
    waitFor: "Member roster",
    action: async (page) => {
      await settle(page, 1300);
      await smoothScroll(page, 420, 2200);
      await settle(page, 1300);
    },
  },
  {
    name: "payments",
    path: "/admin/payments",
    waitFor: "Payment ledger",
    action: async (page) => {
      await settle(page, 1300);
      await smoothScroll(page, 420, 2200);
      await settle(page, 1300);
    },
  },
  {
    name: "wally",
    path: "/",
    waitFor: "Wally",
    action: async (page) => {
      await settle(page, 1000);
      await page.getByRole("button", { name: /Open Wally/i }).click();
      await page.getByPlaceholder("Ask Wally...").fill("What should we fix before the NSW annual report?");
      await settle(page, 400);
      await page.getByRole("button", { name: "Send to Wally" }).click();
      await page.getByText("Before the NSW annual report", { exact: false }).first().waitFor({ timeout: 30000 });
      await settle(page, 5200);
    },
  },
];

async function recordClip(browser: Awaited<ReturnType<typeof chromium.launch>>, clip: Clip) {
  const context: BrowserContext = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    timezoneId: "Australia/Sydney",
    locale: "en-AU",
    colorScheme: "light",
    recordVideo: { dir: outputDir, size: VIEWPORT },
  });
  await context.addInitScript(initScript());
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") {
      console.warn(`[${clip.name}] browser error: ${message.text().slice(0, 220)}`);
    }
  });
  await page.goto(`${baseUrl}${clip.path}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForLoadState("networkidle", { timeout: 45000 }).catch(() => null);
  await page.getByText(clip.waitFor, { exact: false }).first().waitFor({ timeout: 60000 });
  await applyCleanup(page);
  await settle(page, 500);
  await clip.action(page);
  const video = page.video();
  await context.close();
  if (video) {
    const tmpPath = await video.path();
    const finalPath = path.join(outputDir, `${clip.name}.webm`);
    renameSync(tmpPath, finalPath);
    console.log(`${clip.name}: ${finalPath}`);
  }
}

async function main() {
  if (process.env.WILDTRACK360_SCREENSHOT_MODE !== "true") {
    throw new Error("Set WILDTRACK360_SCREENSHOT_MODE=true before recording clips.");
  }

  mkdirSync(outputDir, { recursive: true });
  const filter = process.env.WILDTRACK360_CLIP_FILTER;
  const selected = filter ? clips.filter((clip) => filter.split(",").includes(clip.name)) : clips;
  if (selected.length === 0) {
    throw new Error(`WILDTRACK360_CLIP_FILTER matched no clips: ${filter}`);
  }

  const browser = await chromium.launch();
  const warmup = await browser.newContext({ viewport: VIEWPORT, locale: "en-AU", timezoneId: "Australia/Sydney" });
  await warmup.addInitScript(initScript());
  const warmupPage = await warmup.newPage();
  for (const clip of selected) {
    await warmupPage.goto(`${baseUrl}${clip.path}`, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(() => null);
    await warmupPage.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => null);
  }
  await warmup.close();

  for (const clip of selected) {
    await recordClip(browser, clip);
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
