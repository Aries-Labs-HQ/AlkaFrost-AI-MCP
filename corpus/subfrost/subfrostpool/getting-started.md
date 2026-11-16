---
title: Getting Started for Operators
source: subfrost
source_url: https://docs.subfrost.io/subfrostpool/getting-started
---

# Getting Started for Operators

> Create a pool.subfrost.io operator account, turn on two-factor, mint a pool API key and download the Claude skill.

Operator accounts live on [pool.subfrost.io](https://pool.subfrost.io). Sign-in is handled by subfrost.io, which is the identity provider, so pool.subfrost.io never stores your password, your two-factor secret or your raw API keys.

## 1. Create an account

1. Open [pool.subfrost.io/signup](https://pool.subfrost.io/signup).
2. Enter your email, a name or pool name (optional), and a password. The password must be 12 to 256 characters and mix letters and digits, or be a passphrase longer than 20 characters.
3. Check your inbox for the confirmation link. The page always says the same thing whether or not the address is new: if it already has an account, you get an email telling you to sign in or reset instead.

## 2. Confirm your email

Open the link and click **Confirm email**. The click is deliberate, so a mail scanner that prefetches links cannot use up the token. Links last 24 hours and work once. If yours expired, sign in and choose **Resend confirmation email**. At most 3 verification or reset emails are sent per address per hour.

Confirming activates the account. There is no separate approval step.

## 3. Sign in and turn on two-factor

1. Sign in at [pool.subfrost.io/login](https://pool.subfrost.io/login).
2. Go to **Account → Security**, scan the QR code with an authenticator app, and enter a code to turn on two-factor (TOTP).
3. **Save the 10 recovery codes.** Each works once, and they are shown only this one time.

With two-factor on, sign-in asks for an authenticator code (or a recovery code) after your password. It is optional but strongly recommended: your keys can request templates and submit blocks.

Repeated failed sign-ins lock the account for a while, and the lock grows with each further failure. Sessions last up to 7 days and end after 24 hours idle. Changing or resetting your password signs out your other sessions.

Forgot your password? Use [pool.subfrost.io/forgot](https://pool.subfrost.io/forgot). Reset links last 1 hour.

## 4. Create an API key

Go to **Account → API keys**, name the key (for example, the pool or host that will use it) and click **Create key**.

- Keys look like `sfp_` followed by 43 characters.
- **The key is shown once.** SUBFROST stores only a hash of it. Copy it straight into your pool's secret store.
- Up to 10 active keys per account. Use one key per pool instance, so you can revoke one without touching the others.
- **Revoke** stops a key within about a minute.

Pool keys (`sfp_…`) only work on `pool.subfrost.io/rpc`. The [private flow API](./private-flow-api.md) uses a regular SUBFROST API key from [api.subfrost.io](https://api.subfrost.io/) instead.

Check the key works:

```bash
export SUBFROST_POOL_KEY='sfp_…'
curl -sS -u "x:$SUBFROST_POOL_KEY" -H 'content-type: application/json' \
  -d '{"jsonrpc":"1.0","id":"t","method":"getblockcount","params":[]}' \
  https://pool.subfrost.io/rpc
```

**Account → Stats** shows your calls, errors, rate-limited calls and accepted blocks, per key and per method, for up to 30 days.

## 5. Download the Claude skill (optional)

The **Account** page has a **Download subfrostpool-operator.zip** button. It is a Claude skill that knows how to connect pool software to SUBFROSTPOOL: the connection details, auth, test calls, configuration for common pool software and what each error means.

Unzip it into `~/.claude/skills/`, or into your project's `.claude/skills/`:

```bash
unzip subfrostpool-operator.zip -d ~/.claude/skills/
```

The skill contains **no key**. It lists only your key prefixes, so Claude can tell them apart, and reads the key itself from `$SUBFROST_POOL_KEY`. Export the variable in the shell where Claude runs, and don't paste the key into the chat.

## Next

[Connecting pool software](./connecting-pool-software.md).
