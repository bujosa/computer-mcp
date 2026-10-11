FROM node:22.21.1-bookworm-slim AS desktop
ENV DEBIAN_FRONTEND=noninteractive DISPLAY=:1 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
RUN apt-get update && apt-get install -y --no-install-recommends xvfb x11-utils x11vnc openbox xdotool scrot util-linux fonts-dejavu-core ca-certificates python3 ffmpeg \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/computer-mcp
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npx playwright install --with-deps chromium \
    && chmod -R a+rX /opt/pw-browsers
COPY runtime ./runtime
COPY ui ./ui
COPY scripts/build-ui.mjs ./scripts/build-ui.mjs
COPY src/catalog.js src/connection.js src/audit-contract.js src/desktop-contract.js src/skill-use.js ./src/
RUN node scripts/build-ui.mjs
RUN chmod +x runtime/entrypoint.sh runtime/chromium-agent.sh
EXPOSE 7070
ENTRYPOINT ["/opt/computer-mcp/runtime/entrypoint.sh"]

FROM node:22.21.1-bookworm-slim AS relay
WORKDIR /opt/computer-mcp
COPY runtime/relay.js ./relay.js
USER node
CMD ["node", "relay.js"]
