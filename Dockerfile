# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=24.16.0

FROM node:${NODE_VERSION}-alpine AS build

WORKDIR /usr/src/app

COPY . .

RUN npm install -g @angular/cli

RUN npm i
RUN ng build --configuration=production


FROM node:${NODE_VERSION}-alpine

# python3/make/g++/musl-dev build better-sqlite3 from source.
# sqlite provides the sqlite3 CLI, whose ".recover" command rebuilds a database
# whose B-tree structure is damaged by reading the leaf pages directly. Nothing
# in the SQLite C API can do that, so this ~3 MB is what makes automatic
# recovery from a malformed database possible at all.
RUN apk add --no-cache python3 py3-pip make g++ musl-dev sqlite

COPY --from=build /usr/src/app/dist/energypilot-io/browser /usr/share/html

WORKDIR /usr/src/app

COPY ./server .

RUN npm i --omit=dev

ENV NODE_ENV=production
ENV DATA_DIR=/data/

# Expose the port that the application listens on.
EXPOSE 3000

# HEALTHCHECK CMD curl --fail http://localhost:3000 || exit 1

# Run the application.
CMD ["node", "--import", "tsx", "src/server.ts"]