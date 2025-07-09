# NPM builder image
FROM node:20-alpine as npm_builder

WORKDIR /app
COPY [ "package.json", "package-lock.json", "tsconfig.json", "./"]
COPY [ "src/", "./src/" ]

RUN npm ci
RUN npm run build

# NPM runtime image
FROM node:20-alpine as npm_runtime

WORKDIR /app

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

# Avoid running as root:
USER node

COPY --from=npm_builder [ "/app/node_modules/", "./node_modules/" ]
COPY --from=npm_builder [ "/app/dist/", "./src/" ]

ENTRYPOINT [ "node", "src/botservice.js" ]