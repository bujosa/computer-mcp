# Adapter contract and support roadmap

The only implemented runtime adapter is **docker-linux**, using a local Docker
Linux engine. The host bridge and guest service are separate boundaries: a new
adapter must implement computer execution/identity, not introduce model routing
or a second chatbot backend.

## Required adapter semantics

A future adapter must report stable `computerId`/`workspaceId`, distinct host and
guest OS, actual isolation mode (`container`, `vm`, `native-host` or `remote`),
boot identity, supported capabilities and tested limits. It must refuse a pinned
identity mismatch before execution. Missing capabilities are omitted/explicitly
unavailable, never silently routed to the host.

Execution requires per-computer lease ownership and serialized mutations,
operation cancellation/deadlines/output limits and an explicit partial-effect
contract. Human observation/control and takeover must address both tool calls
and native input sockets. Desktop streaming must be authenticated; a publicly
reachable CDP/VNC port is not an adapter. Files use an explicit workspace and
OS-native containment rather than string-prefix checks alone. Persistence and
recordings must stay scoped to the owning computer. Lifecycle must prove resource
ownership before start/stop/delete and separate user-owned existing PCs from
new agent-owned guests.

## Realistic adapter choices

| Adapter            | How it could work                                                                                | Permissions/ownership                                                                                        | Current status                                             |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| Local Linux Docker | Current guest service, named volume, private network, browser desktop                            | Owned container, local Docker-daemon permission                                                              | Implemented; macOS ARM64 host exercised                    |
| Native macOS       | Local agent service using ScreenCaptureKit/accessibility APIs or a focused browser/files adapter | Explicit screen/input permissions; existing user desktop, no isolation                                       | Design only; no OS permission changes made                 |
| Native Windows     | Local service with desktop capture/input APIs and Windows workspace containment                  | Interactive-session permission; existing desktop, no isolation                                               | Design only                                                |
| Native Linux       | Local service using X11/Wayland-specific capture/input support                                   | Explicit session access; existing desktop, no isolation                                                      | Design only                                                |
| Linux VM           | Guest service with libvirt/Hyper-V/Virtualization framework/QEMU adapter, private guest network  | Owned VM image/disk and verified lifecycle IDs                                                               | Design only; stronger kernel separation than containers    |
| Windows VM         | Windows guest service plus Hyper-V/QEMU/other hypervisor lifecycle                               | Windows licensing, owned guest and isolated profile                                                          | Design only; no Windows guest test performed               |
| macOS VM           | macOS guest service on appropriate Apple hardware and supported virtualization                   | Apple hardware/licensing, owned guest disk and OS permissions                                                | Design only; no macOS guest test performed                 |
| Remote owned guest | Identity-pinned adapter over authenticated private transport (e.g. SSH tunnel/mTLS)              | Explicit machine authorization; remote root/operator remains trusted                                         | Design only; remote Docker contexts refused                |
| Piblo              | Separate bridge mapping its scoped capabilities and control/identity contract                    | Existing Piblo owner authorizes sharing; its shared-bot desktop is not falsely described as isolated per bot | Future integration; no production/QA Piblo connection made |

## Integration with Piblo later

Do not import its provider/gateway/bot/library/routine APIs here. A reviewed
Piblo adapter should translate tool discovery and requests, preserve its bot
permissions and workspace pin, and make its shared-desktop lease contract
compatible before advertising control. Teach metadata can be converted through a
versioned export format; copying databases or private recordings is unnecessary.
Piblo’s current API/token vocabulary is not a generic portable runtime contract.

Remote transports need their own authentication, replay protection, request body
limits, idempotency/ambiguous-result handling, token rotation and access revocation.
A hostname alone is not computer identity. Hosted deployment/provisioning remains
out of scope for this repo.
