#!/usr/bin/env node
import { runMain } from "@effect/platform-node/NodeRuntime";
import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { Effect } from "effect";
import { sizuku } from "./cli/index.js";

runMain(sizuku().pipe(Effect.provide(nodeServicesLayer)));
