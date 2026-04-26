import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const DOC_ID = "default";

/**
 * Devuelve el estado completo guardado en la nube.
 * Si no hay nada guardado, retorna data: null y ts: 0.
 */
export const getState = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("appState")
      .withIndex("by_doc", (q) => q.eq("docId", DOC_ID))
      .unique();
    if (!row) return { data: null, ts: 0 };
    return { data: row.data, ts: row.ts };
  },
});

/**
 * Guarda (o reemplaza) el estado completo en la nube.
 * Solo guarda si el ts entrante es mayor al actual (last-write-wins).
 */
export const setState = mutation({
  args: {
    data: v.any(),
    ts: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("appState")
      .withIndex("by_doc", (q) => q.eq("docId", DOC_ID))
      .unique();

    if (!existing) {
      await ctx.db.insert("appState", {
        docId: DOC_ID,
        data: args.data,
        ts: args.ts,
      });
      return { ok: true, ts: args.ts };
    }

    if (args.ts <= existing.ts) {
      return { ok: false, ts: existing.ts, reason: "stale" };
    }

    await ctx.db.patch(existing._id, { data: args.data, ts: args.ts });
    return { ok: true, ts: args.ts };
  },
});
