# Operate the guest desktop

`desktop_action` extends the existing Linux Docker computer with pointer movement,
clicks, wheel scrolling, single-line typing and a supported key/chord. It operates
only on the guest's Xvfb display. It gives no native host permission or isolated
Windows/macOS guest. Rebuild the selected computer after updating source.

Read `computer_info` and check the owning computer/workspace, `desktop`, limits
and capabilities. Acquire `control_acquire`. Inspect a fresh `desktop_screenshot`
before choosing a coordinate or typing into the focused window. Prefer browser
selectors and contained files when those tools express the task more precisely.

## Actions

Each row is an argument object for `desktop_action`:

| Action | Example                                                            | Limit                                                    |
| ------ | ------------------------------------------------------------------ | -------------------------------------------------------- |
| Move   | `{"action":"move","x":200,"y":180}`                                | Native guest pixels; x 0–1279, y 0–799                   |
| Click  | `{"action":"click","x":200,"y":180,"button":"left","clicks":1}`    | left/middle/right; one or two clicks                     |
| Scroll | `{"action":"scroll","x":200,"y":180,"direction":"down","steps":2}` | up/down/left/right; one to ten wheel steps               |
| Type   | `{"action":"type","text":"A supplied value"}`                      | 1–1024 UTF-16 units, no control characters/newlines/tabs |
| Key    | `{"action":"key","key":"Ctrl+l"}`                                  | One supported key, optional modifiers                    |

Supported key names: Return, Tab, Escape, BackSpace, Delete, Insert, Home, End,
Page_Up, Page_Down, Left, Right, Up, Down, space, F1–F12, or one ASCII letter/digit.
Prepend distinct Ctrl, Alt, Shift or Super modifiers, up to three, joined with
`+`. Send Return/Tab as explicit key actions. Held keys, drag, clipboard transfer,
raw xdotool commands, display/window IDs and arbitrary JavaScript are not tool
arguments. Internet/external actions still need authorization from the current
user task; a saved skill does not grant it.

Coordinates use the full **1280×800** guest screen, with origin at the top left.
Owner noVNC, teaching video and MCP analysis samples may be scaled. Do not use
their displayed coordinates directly. Recheck a fresh native screenshot and
current focus; saved positions can be stale after scrolling, resizing or moving
a window. There is no automatic location inference or blind replay.

`inputSent: true` means that the input subprocess finished. It does not prove
the correct app received it, a file was saved or a task succeeded. Inspect the
result with browser/file tools or a new guest screenshot, then release control.

## The desktop you see

The guest starts with a Sendtry wallpaper and a dock along the bottom 48 px:
**Show desktop**, **Browser** (raises the runtime's Chromium window), **Files**
(Thunar in `/data/workspace`), **Terminal** (a guest shell in the workspace),
the open windows and a clock. Chromium opens at 1280×752 above the dock; tool
coordinates still use the full 1280×800 screen.

**Files and Terminal are owner apps.** They open only while the owner holds
control from the console, and they close as soon as an agent takes control. The
runtime publishes the current holder (`owner`, `agent` or `free`) in the
root-owned `/run/computer-mcp/desktop-apps`; the dock launchers read it and show
a notice instead of opening. While an agent holds control the runtime also
closes those apps every second, so launching the terminal binary through
`terminal_run` does not leave an unbounded shell on screen. Agents keep using the
browser, `desktop_action`, and the bounded `files_*` and `terminal_run` tools,
whose effects stay in Activity. A missing or unreadable holder file is treated
as "not the owner". Openbox has no root menu or program key bindings. These are
guest processes in the container, not host access.

## Authority, cancellation and recovery

Work access and the exclusive lease are required. Read access cannot invoke
this tool, even with the current work session's UUID. It runs as guest UID/GID
1000 with a clean environment and fixed display/executable. Text goes through
stdin, not a shell or command-line argument. Each input has a five-second deadline
and a 4 KiB discarded-output ceiling. No helper stderr or input is returned.

Cancellation, disconnect, lease loss and owner takeover kill only the active
input child. A separate one-second cleanup releases every held X11 key and
buttons before another serialized mutation starts. Ordinary keys, modifiers and
Unicode typing can otherwise leave input pressed after an interruption. Cleanup
queries state without recording key values. If cleanup fails, the runtime
revokes control, disconnects desktop sockets and refuses new API work. Stop/start
or rebuild **that selected owned computer**; do not change host permissions.
Cancellation does not undo input already delivered. Inspect before retrying.
Python cleanup uses `-I -S` to exclude guest user-site customization. Takeover
revokes the old control channel and waits for cleanup before granting the new
lease; acquires during the transition are rejected. RFB messages are also checked
against the live lease generation.

## Teach and Activity

During Teach, owner API desktop actions retain action/geometry but replace text
and key values with supplied parameters. Browser events caused by that desktop
action are suppressed, including a later field blur/change, so the skill does
not execute both `fill` and `type`. Subsequent owner edits record normally.
Navigation/close preserve delivered input and its recorded step. If browser
correlation cannot be restored, Teach saves as interrupted and refuses skill
export; `teachingInterrupted: true` accompanies an otherwise delivered input.
Browser recording still captures other main-frame events. Human noVNC input in
other windows is reference
evidence in the optional video; there is no generic input logger. The connected
vision agent can now propose supported desktop actions from that evidence, with
uncertain targets/keys and missing values explicitly marked. Owner correction,
exact-revision review and a verifiable result remain required before skill export.

Activity records the action family, scoped identity, times and outcome, excluding
coordinates, text, keys and helper output. It measures tool execution; a successful
input event is not proof of task success. See [Teach](TEACH.md) and
[Activity](ACTIVITY.md).

## Validation

```sh
npm test
npm run test:desktop-integration -- /absolute/owned/idle/qa-state /private/artifacts
npm run test:e2e -- --context desktop-linux
```

The real security/runtime contract uses the guest's installed `xev` diagnostic
window to observe native click/key/type/wheel delivery and takeover. It saves a
new demonstration, checks omitted input/export, combines native typing with a
real Chromium form and verifies the saved app result. It terminates only its
exact diagnostic PID/name and retains private evidence. This is backend/X11
contract validation; owner UI appearance is reviewed manually.

Primary contracts: [xdotool upstream](https://github.com/jordansissel/xdotool/blob/main/xdotool.pod),
[Xlib state queries](https://x.org/releases/current/doc/libX11/libX11/libX11.pdf),
[XTEST input](https://www.x.org/docs/Xext/xtest.pdf),
[Python isolation](https://docs.python.org/3/using/cmdline.html#cmdoption-I), and
[MCP tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools).
