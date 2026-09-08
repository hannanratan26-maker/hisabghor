/**
 * Backend client (Lovable Cloud) exposing the same surface the app used before:
 * base44.entities.<Entity>.{list,filter,get,create,update,delete}
 * base44.auth.{me,updateMe,logout,redirectToLogin}
 */
import { supabase } from "@/integrations/supabase/client";
import { getActiveShopId } from "@/lib/shop";

const TABLES = {
  Party: "parties",
  Transaction: "transactions",
  CashEntry: "cash_entries",
  Product: "products",
  SubCategory: "sub_categories",
  Package: "packages",
  AppSettings: "app_settings",
  User: "profiles",
  Shop: "shops",
  Sale: "sales",
};

// Tables whose rows belong to a single shop.
const SHOP_SCOPED = new Set(["Party", "Transaction", "CashEntry", "Product", "SubCategory", "Sale"]);

// Columns that only existed in the old backend – ignore them in queries.
const IGNORED_FILTER_KEYS = new Set(["created_by"]);

function applySort(query, sort) {
  if (!sort) return query.order("created_date", { ascending: false });
  const desc = sort.startsWith("-");
  const column = desc ? sort.slice(1) : sort;
  return query.order(column, { ascending: !desc });
}

function unwrap({ data, error }) {
  if (error) {
    const err = new Error(error.message);
    err.status = error.code;
    throw err;
  }
  return data;
}

async function currentEmail() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.email ?? null;
}

// Profiles has no role column – roles live in user_roles. Join them for the User entity.
async function attachRoles(rows) {
  if (!rows) return rows;
  const list = Array.isArray(rows) ? rows : [rows];
  if (list.length === 0) return rows;
  const ids = list.map((r) => r.id);
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", ids);
  const roleMap = new Map();
  for (const rr of roleRows ?? []) {
    if (rr.role === "admin" || !roleMap.has(rr.user_id)) roleMap.set(rr.user_id, rr.role);
  }
  const withRole = (r) => ({ ...r, role: roleMap.get(r.id) ?? "user" });
  return Array.isArray(rows) ? list.map(withRole) : withRole(list[0]);
}

function makeEntity(name) {
  const table = TABLES[name];

  return {
    async list(sort, limit) {
      let q = supabase.from(table).select("*");
      if (SHOP_SCOPED.has(name)) q = q.eq("shop_id", getActiveShopId() ?? "00000000-0000-0000-0000-000000000000");
      q = applySort(q, sort);
      if (limit) q = q.limit(limit);
      const rows = unwrap(await q) ?? [];
      return name === "User" ? attachRoles(rows) : rows;
    },

    async filter(criteria = {}, sort, limit) {
      let q = supabase.from(table).select("*");
      if (SHOP_SCOPED.has(name)) q = q.eq("shop_id", getActiveShopId() ?? "00000000-0000-0000-0000-000000000000");
      for (const [key, value] of Object.entries(criteria)) {
        if (IGNORED_FILTER_KEYS.has(key)) continue;
        if (value === undefined) continue;
        if (Array.isArray(value)) q = q.in(key, value);
        else q = q.eq(key, value);
      }
      q = applySort(q, sort);
      if (limit) q = q.limit(limit);
      const rows = unwrap(await q) ?? [];
      return name === "User" ? attachRoles(rows) : rows;
    },

    async get(id) {
      const row = unwrap(await supabase.from(table).select("*").eq("id", id).maybeSingle());
      return name === "User" && row ? attachRoles(row) : row;
    },

    async create(data) {
      const payload = { ...data };
      if (name === "Shop") {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;
        if (!userId) throw new Error("Not authenticated");
        if (!payload.user_id) payload.user_id = userId;
      } else if (name !== "User") {
        payload.created_by = await currentEmail();
      }
      if (SHOP_SCOPED.has(name) && !payload.shop_id) payload.shop_id = getActiveShopId();
      return unwrap(await supabase.from(table).insert(payload).select().single());
    },

    async bulkCreate(rows) {
      const email = await currentEmail();
      const shopId = getActiveShopId();
      const payload = rows.map((r) => ({
        ...r,
        created_by: email,
        ...(SHOP_SCOPED.has(name) && !r.shop_id ? { shop_id: shopId } : {}),
      }));
      return unwrap(await supabase.from(table).insert(payload).select()) ?? [];
    },

    async update(id, data) {
      const payload = { ...data };
      delete payload.id;
      delete payload.created_date;
      delete payload.created_by;
      // Roles live in user_roles, not on the profile row.
      let desiredRole;
      if (name === "User" && "role" in payload) {
        desiredRole = payload.role;
        delete payload.role;
      }
      // If only the role is being changed, skip the empty profiles update.
      const hasPayload = Object.keys(payload).length > 0;
      const updated = hasPayload
        ? unwrap(await supabase.from(table).update(payload).eq("id", id).select().single())
        : unwrap(await supabase.from(table).select("*").eq("id", id).single());
      if (desiredRole) {
        await supabase.from("user_roles").delete().eq("user_id", id).neq("role", desiredRole);
        await supabase
          .from("user_roles")
          .upsert({ user_id: id, role: desiredRole }, { onConflict: "user_id,role" });
        updated.role = desiredRole;
      }
      return updated;
    },

    async delete(id) {
      unwrap(await supabase.from(table).delete().eq("id", id).select());
      return { id };
    },
  };
}

const entities = Object.fromEntries(Object.keys(TABLES).map((k) => [k, makeEntity(k)]));

const auth = {
  async me() {
    const { data: sessionData } = await supabase.auth.getUser();
    const authUser = sessionData?.user;
    if (!authUser) {
      const err = new Error("Not authenticated");
      err.status = 401;
      throw err;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authUser.id);

    const isAdmin = (roles ?? []).some((r) => r.role === "admin");

    return {
      id: authUser.id,
      email: authUser.email,
      full_name: profile?.full_name || authUser.user_metadata?.full_name || "",
      ...(profile ?? {}),
      role: isAdmin ? "admin" : "user",
    };
  },

  async updateMe(data) {
    const { data: sessionData } = await supabase.auth.getUser();
    const authUser = sessionData?.user;
    if (!authUser) throw new Error("Not authenticated");
    const payload = { ...data };
    delete payload.id;
    delete payload.role;
    delete payload.email;
    return unwrap(
      await supabase.from("profiles").update(payload).eq("id", authUser.id).select().single(),
    );
  },

  async logout() {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") window.location.href = "/auth";
  },

  redirectToLogin() {
    if (typeof window !== "undefined") window.location.href = "/auth";
  },
};

const integrations = {
  Core: {
    // Email sending is not configured in this app yet.
    async SendEmail(payload) {
      console.warn("SendEmail is not configured", payload);
      return { success: false };
    },
  },
};

export const base44 = { entities, auth, integrations };
export default base44;
