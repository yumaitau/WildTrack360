// No-op stand-in for the `server-only` marker package. Cron scripts run the TS
// source directly via tsx (plain Node, no bundler), where `server-only`'s real
// entry throws on import. tsconfig.scripts.json aliases `server-only` here so
// those standalone runs don't blow up; the Next build still uses the real one.
export {};
