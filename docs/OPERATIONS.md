# Operate the local source preview

[First setup](WALKTHROUGH.md) · [Recovery](RECOVERY.md) · [Command reference](SETUP.md)

Use these procedures from your dedicated source checkout. Keep its path stable:
your harness configuration contains absolute Node, CLI and private connection
paths. Replace example names/paths with your own. Each command acts on one named
computer; a CLI default change never retargets an existing MCP connection.

## Start, inspect and stop

```sh
node src/cli.js list
node src/cli.js status --name my-computer
node src/cli.js doctor --name my-computer
node src/cli.js start --name my-computer
node src/cli.js open --name my-computer
node src/cli.js check --connection "ABSOLUTE_PRIVATE_FILE"
```

The harness launches the separate stdio process. `start` reuses an already ready
guest; it does not dispatch a model or task. Inspect **Tasks**, **Activity** and
current control before a stop, rebuild or revocation. Finish active work or
explicitly cancel it and inspect partial effects first.

```sh
node src/cli.js stop --name my-computer
```

Stop retains the volume, files, browser profile, workflows and audit history.
An interrupted assignment cannot resume: observe its output and create a new
owner request if another attempt is needed. Normal restart persistence is tested;
that does not prove recovery after volume loss, disk failure or power loss.

## Update a source installation deliberately

Use a clean, dedicated clone on `main`. First inspect these read-only checks:

```sh
git status --short
git branch --show-current
git rev-parse HEAD
node src/cli.js status --name my-computer
```

If the checkout has local edits, is on another branch or the PC has active work,
resolve that situation before continuing. Save the previous source SHA for
recovery. Back up valuable private state/data before an update. There is no
automatic updater or promised compatibility of arbitrary historical runtimes.

```sh
node src/cli.js stop --name my-computer
git pull --ff-only origin main
npm ci
node src/cli.js doctor --name my-computer
node src/cli.js start --name my-computer --rebuild
node src/cli.js check --connection "ABSOLUTE_PRIVATE_FILE"
```

Reconnect the harness. Check the same computer/workspace IDs and perform a
small assigned task whose output you inspect independently. Update/rebuild any
other PC sharing this checkout separately after inspecting its work. Do not
change Docker's global context, discard edits, reset a volume or downgrade a
persistent store to resolve a failed update. Follow [recovery](RECOVERY.md).

## Retire an agent connection without deleting its computer

```sh
node src/cli.js connection list --name my-computer
node src/cli.js connection revoke CONNECTION_UUID --name my-computer
```

Use the exact UUID from that PC's list. Revocation is irreversible and interrupts
that grant's attempt. Remove only its generated server entry from your harness,
preserving other servers. Remove the project operator skill only if no other
connection uses it. Disconnect the corresponding MCP session. A copied private
file cannot restore a revoked grant; the owner must issue a new one.

If retiring the whole PC, inspect its work and stop it. This deliberately keeps
its private data. There is no built-in destructive uninstall/purge command.
Do not use Docker-wide prune, guess resource names or remove other computers.

## Protect data before changing or removing storage

There are two separate private data locations: the host catalog/configuration
and connection files (normally `~/.computer-mcp`), and each PC's owned Docker
volume. Copying only the source checkout is not a computer backup.

For a manual cold backup, first stop the selected PC and inspect its exact
context, UUID and owned volume. Back up that volume and the corresponding host
state together into private protected storage. Browser profiles, task content,
videos and credentials can be sensitive. Do not upload them with the public
operator skill or repository. Docker documents its underlying
[volume backup/restore mechanism](https://docs.docker.com/engine/storage/volumes/#back-up-restore-or-migrate-data-volumes).

Managed backup/restore and complete erasure remain outside this source preview.
No tested cross-host restore or portable taught-skill rebinding is claimed.
Do not start a cloned identity alongside the original or restore an untrusted
archive over a working PC. A restore procedure must preserve ownership,
permissions, identities and consistent databases and verify real output before
resuming use. Keep the original data until recovery is independently checked.
