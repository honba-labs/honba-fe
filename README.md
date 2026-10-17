# honba-fe

The Honba web frontend. Replaces `honba-frontend`. See [docs/plan.md](docs/plan.md) for the full
implementation plan, current phase, and parity checklist against `honba-frontend`.

## Dev loop

```
npm install
make dev   # runs `honba serve` + `vite` together
```

Requires a sibling `honba` checkout (for the backend) at `../honba`.
