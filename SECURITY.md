# Security Notice

- `data/users.json` contains runtime accounts and encrypted provider tokens.
- Do **not** commit real runtime data files.
- This repository now tracks only safe defaults/templates.

If sensitive data was committed before, rotate all affected tokens immediately and rewrite git history.
