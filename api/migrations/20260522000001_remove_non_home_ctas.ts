import type { Knex } from "knex";

const BACKUP_KEY = "cta_cleanup_backup_20260522000001";

type BlockRow = {
  id: number;
  page_id: number;
  type: string;
  order: number;
  props: unknown;
  slug: string;
  page_title: string;
};

type BackupBlock = {
  id: number;
  pageId: number;
  pageSlug: string;
  pageTitle: string;
  type: string;
  order: number;
  props: unknown;
};

export async function up(knex: Knex): Promise<void> {
  const ctas = await knex("blocks as b")
    .join("pages as p", "p.id", "b.page_id")
    .where("b.type", "cta")
    .orderBy("p.slug")
    .orderBy("b.order")
    .orderBy("b.id")
    .select<BlockRow[]>(
      "b.id",
      "b.page_id",
      "b.type",
      "b.order",
      "b.props",
      "p.slug",
      "p.title as page_title",
    );

  let keptHomeEmergency = false;
  const removed: BackupBlock[] = [];

  for (const block of ctas) {
    const isAllowedHomeEmergency =
      block.slug === "home" && !keptHomeEmergency && blockTitleIncludes(block.props, "emergencia");

    if (isAllowedHomeEmergency) {
      keptHomeEmergency = true;
      continue;
    }

    removed.push({
      id: block.id,
      pageId: block.page_id,
      pageSlug: block.slug,
      pageTitle: block.page_title,
      type: block.type,
      order: block.order,
      props: parseJson(block.props),
    });
  }

  if (removed.length > 0) {
    await knex("settings").where({ key: BACKUP_KEY }).del();
    await knex("settings").insert({
      key: BACKUP_KEY,
      value: JSON.stringify({
        createdAt: new Date().toISOString(),
        reason: "Removed public CTA bands except the home emergency CTA.",
        removed,
      }),
      updated_at: knex.fn.now(),
    });

    await knex("blocks").whereIn("id", removed.map((block) => block.id)).del();
  }

  const affectedPageIds = Array.from(new Set(ctas.map((block) => block.page_id)));
  await reorderPages(knex, affectedPageIds);
}

export async function down(knex: Knex): Promise<void> {
  const backupRow = await knex("settings").where({ key: BACKUP_KEY }).first("value");
  if (!backupRow) return;

  const backup = parseJson(backupRow.value) as { removed?: BackupBlock[] };
  const removed = Array.isArray(backup.removed) ? backup.removed : [];
  const affectedPageIds = new Set<number>();

  for (const block of removed) {
    const page = await knex("pages").where({ id: block.pageId }).first("id");
    if (!page) continue;

    const existing = await knex("blocks").where({ id: block.id }).first("id");
    if (existing) continue;

    await knex("blocks").insert({
      id: block.id,
      page_id: block.pageId,
      type: block.type,
      order: block.order,
      props: JSON.stringify(block.props ?? {}),
    });
    affectedPageIds.add(block.pageId);
  }

  await reorderPages(knex, Array.from(affectedPageIds));
}

async function reorderPages(knex: Knex, pageIds: number[]) {
  for (const pageId of pageIds) {
    const blocks = await knex("blocks")
      .where({ page_id: pageId })
      .orderBy("order")
      .orderBy("id")
      .select<{ id: number }[]>("id");

    for (let order = 0; order < blocks.length; order++) {
      await knex("blocks").where({ id: blocks[order].id }).update({ order });
    }
  }
}

function blockTitleIncludes(props: unknown, needle: string) {
  const parsed = parseJson(props);
  if (!parsed || typeof parsed !== "object" || !("title" in parsed)) return false;
  const title = (parsed as { title?: unknown }).title;
  return typeof title === "string" && normalizeText(title).includes(needle);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
