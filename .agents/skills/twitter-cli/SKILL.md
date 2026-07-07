---
name: twitter-cli
description: Read-only Twitter/X observation runbook for Oh-MY-TradingView. Prefer repo CLI `tv x ...` or MCP `x_*` tools over direct binary calls.
tags:
  - twitter
  - x
  - read-only
  - cli
---

# twitter-cli

Oh-MY-TradingView exposes Twitter/X only as a read-only observation source. Use it for authentication checks, search, profile lookup, user posts, and individual post detail.

## Preferred Entry Points

Inside this repository, prefer these wrappers:

| Task | CLI | MCP tool |
|---|---|---|
| Auth status | `tv x status` | `x_status` |
| Current account | `tv x whoami` | `x_whoami` |
| Search posts | `tv x search --query "NVDA"` | `x_search_posts` |
| User profile | `tv x user --username tradingview` | `x_user_profile` |
| User posts | `tv x user-posts --username tradingview --max 10` | `x_user_posts` |
| Post detail | `tv x tweet --id 1234567890` | `x_tweet_detail` |

The external `twitter` binary from twitter-cli is an implementation dependency used by `src/core/twitter-read.js`. Do not bypass the repo wrapper unless you are debugging the adapter itself.

## Authentication

Before using X data, check auth:

```powershell
npm run tv -- x status
npm run tv -- x whoami
```

The adapter can use local browser cookies or `TWITTER_AUTH_TOKEN` / `TWITTER_CT0` from the local environment. Treat all cookie and token values as secrets.

Do not ask the user to paste a full cookie string into chat. If credentials are missing or expired, ask the user to refresh local browser login or configure secrets locally outside chat.

## Read-Only Commands

Examples:

```powershell
npm run tv -- x search --query "NVDA earnings" --max 10 --compact
npm run tv -- x user --username tradingview
npm run tv -- x user-posts --username tradingview --max 10 --compact
npm run tv -- x tweet --id 1234567890 --compact
```

Use compact output for broad context gathering. Use full output only when the user needs exact fields or detailed inspection.

## Failure Handling

| Symptom | Check |
|---|---|
| twitter-cli missing | Ensure the `twitter` binary is available to the Node process |
| Auth required | Run `npm run tv -- x status` and refresh local browser login or local env vars |
| Expired credentials | Re-authenticate locally; do not share secrets in chat |
| Rate limited | Wait and retry with a smaller `--max` |
| Large output | Use `--compact` or lower `--max` |

## Boundaries

This repository does not expose Twitter/X writing or account mutation. Keep this skill limited to read-only observation and research support.
