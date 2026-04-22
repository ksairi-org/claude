# claude

Mariano Ksairi's Claude Code configuration — marketplace plugins, global hooks, and tooling.

## Plugins

| Plugin | Description |
| --- | --- |
| [expo-rn-plugin](plugins/expo-rn-plugin/) | Claude Code plugin for React Native / Expo + Supabase projects |

## Contributing

After cloning, install the git hooks:

```bash
bash scripts/install-hooks.sh
```

This installs a pre-push hook that rebuilds MCP server `dist/` before every push and keeps CI green.
