# Third-party notices

Sendtry Computer code and the generic operator skill use MIT. That grant does
not replace dependency licenses, the Sendtry brand rules or rights in user task
content. This source preview does not distribute a prebuilt guest image.

## Direct runtime/build dependencies

| Component             | Pinned version    | Upstream license/source                                                                     |
| --------------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| MCP client/server SDK | 2.3.1             | [Apache-2.0](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/LICENSE)      |
| noVNC                 | 1.6.0 tag archive | [MPL-2.0 and included file notices](https://github.com/novnc/noVNC/blob/v1.6.0/LICENSE.txt) |
| esbuild               | 0.25.12           | [MIT](https://github.com/evanw/esbuild/blob/main/LICENSE.md)                                |
| Express               | 5.1.0             | [MIT](https://github.com/expressjs/express/blob/master/LICENSE)                             |
| Playwright            | 1.64.0            | [Apache-2.0](https://github.com/microsoft/playwright/blob/main/LICENSE)                     |
| ws                    | 8.22.0            | [MIT](https://github.com/websockets/ws/blob/master/LICENSE)                                 |
| Zod                   | 4.6.7             | [MIT](https://github.com/colinhacks/zod/blob/main/LICENSE)                                  |

`npm-shrinkwrap.json` pins transitive source URLs, integrity and available license
metadata. Installed packages retain their own license/copyright files. Current
runtime transitive metadata includes MIT, Apache-2.0, BSD-3-Clause, ISC and the
noVNC package's MPL-2.0 terms. Development tooling, including `yaml` 2.9.1 (ISC),
keeps its upstream licenses and is excluded from the production dependency set.
This inventory is not a claim that every future dependency/license is approved.

## noVNC bundle and modified source

The console bundles the pinned noVNC archive using `scripts/build-ui.mjs`.
Generated legal comments and the upstream license are retained; the runtime
serves `/novnc/LICENSE.txt`. The build script modifies only its H.264 capability
probe to close the test VideoFrame/decoder on completion/failure. The exact
changes and pinned source checks are in that script. This repository plus the
pinned archive provides the source and reproducible modification; downstream
redistributors must retain MPL notices/source access for covered files.
See [reuse provenance](docs/REUSE.md) for the implemented boundary. MIT applies
to our integration, not a relicensing of noVNC.

## Locally assembled guest

The Dockerfile builds on the pinned Node Debian image and installs Chromium,
Openbox, Xvfb, x11vnc, FFmpeg, fonts, Python and other Linux packages. They retain
their own licenses/notices under their installed package locations, including
`/usr/share/doc`. Node, browser and Debian packages are not relicensed by this
repository. Before distributing a binary/container image, inventory that exact
built image and satisfy its source/notice obligations; this source review is
not an image-license clearance or a public image release.

The Sendtry SVGs are covered separately by [TRADEMARKS.md](TRADEMARKS.md).
No private Piblo source, customer data, credentials or recordings are included
in the source or operator package. Owner-exported taught skills contain task
content and local bindings; their owner must separately review publication rights
and sensitive data before sharing them.
