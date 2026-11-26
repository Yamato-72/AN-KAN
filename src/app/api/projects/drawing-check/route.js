import sql from "@/app/api/utils/sql";
import { findProjectSpace, postToSpace, getServiceToken } from "@/app/api/utils/googleChat";
import { formatProjectNumber } from "@/lib/prefixes";

// ============================================================
// 案件フォルダに図面が入ったら、案件の Google Chat スペースへ知らせる窓口
//   - GAS（時間主導トリガー）が10分おきに GET / POST で呼ぶ。だれが何回呼んでも同じ結果になる
//   - サービスアカウントで Drive を検索し、直近3日に追加・変更されたファイルのうち
//     名前に「図面」または「drawing」（大文字小文字は問わない）が入ったものを拾う
//   - そのファイルが、AN-KAN が作った案件フォルダ（projects.drive_folder_id）の中
//     （下の階層でもOK）にあれば、その案件のスペースに1回だけ投稿する
//   - 通知済みのファイルは drawing_seen 表に覚える。初めて動かしたときは
//     「今あるもの」を覚えるだけで投稿しない（過去の図面がまとめて流れないように）
//   - ?dry=1 を付けると、投稿も記録もせずに「何が見つかったか」だけ返す（確認用）
// ============================================================

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const NAME_RE = /図面|drawing/i;
const WINDOW_DAYS = 3;
const FOLDER_MIME = "application/vnd.google-apps.folder";

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "Content-Type": "application/json" } });
}

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS drawing_seen (
      file_id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL DEFAULT '',
      prefix TEXT,
      number INTEGER,
      seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function driveGet(token, path, params) {
  const url = `https://www.googleapis.com/drive/v3/${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Driveの読み取りに失敗: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// 直近に追加・変更されたファイル（フォルダ以外）
async function listRecentFiles(token) {
  const since = new Date(Date.now() - WINDOW_DAYS * 86400_000).toISOString();
  const q = `trashed = false and mimeType != '${FOLDER_MIME}' and (modifiedTime > '${since}' or createdTime > '${since}')`;
  const files = [];
  let pageToken = "";
  for (let i = 0; i < 10; i++) {
    const data = await driveGet(token, "files", {
      q,
      corpora: "allDrives",
      includeItemsFromAllDrives: "true",
      supportsAllDrives: "true",
      pageSize: "200",
      fields: "nextPageToken, files(id, name, parents, webViewLink)",
      ...(pageToken ? { pageToken } : {}),
    });
    files.push(...(data.files || []));
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return files;
}

export async function GET(request) {
  return run(request);
}
export async function POST(request) {
  return run(request);
}

async function run(request) {
  const dry = new URL(request.url).searchParams.get("dry") === "1";
  try {
    // 1) 案件フォルダの一覧（フォルダID → 案件）
    const projects = await sql`
      SELECT id, COALESCE(prefix, 'AD') AS prefix, ad_number, drive_folder_id
      FROM projects WHERE drive_folder_id IS NOT NULL AND drive_folder_id <> ''
    `;
    const folderToProject = new Map(projects.map((p) => [p.drive_folder_id, p]));

    // 2) 名前に「図面 / drawing」が入った最近のファイル
    const token = await getServiceToken(DRIVE_SCOPE);
    const candidates = (await listRecentFiles(token)).filter((f) => NAME_RE.test(f.name || ""));

    // 3) どの案件フォルダの中にあるか（親をたどる。たどった結果は覚えて使い回す）
    const parentCache = new Map();
    async function parentsOf(id) {
      if (parentCache.has(id)) return parentCache.get(id);
      let parents = [];
      try {
        parents = (await driveGet(token, `files/${id}`, { fields: "parents", supportsAllDrives: "true" })).parents || [];
      } catch {
        parents = [];
      }
      parentCache.set(id, parents);
      return parents;
    }
    async function projectOf(file) {
      let ids = file.parents || [];
      for (let depth = 0; depth < 6 && ids.length; depth++) {
        const hit = ids.find((id) => folderToProject.has(id));
        if (hit) return folderToProject.get(hit);
        ids = await parentsOf(ids[0]);
      }
      return null;
    }
    const found = [];
    for (const f of candidates) {
      const p = await projectOf(f);
      if (p) found.push({ file: f, project: p });
    }

    if (dry) {
      return json({
        message: "確認のみ（投稿・記録はしていません）",
        found: found.map(({ file, project }) => ({ project: formatProjectNumber(project.prefix, project.ad_number), name: file.name })),
      });
    }

    // 4) まだ通知していないものだけ残す（初回は覚えるだけ）
    await ensureTable();
    const firstRun = Number((await sql`SELECT COUNT(*)::int AS n FROM drawing_seen`)[0].n) === 0;
    const fresh = [];
    for (const item of found) {
      const ins = await sql`
        INSERT INTO drawing_seen (file_id, file_name, prefix, number)
        VALUES (${item.file.id}, ${item.file.name}, ${item.project.prefix}, ${item.project.ad_number})
        ON CONFLICT (file_id) DO NOTHING
        RETURNING file_id
      `;
      if (ins.length) fresh.push(item);
    }
    if (firstRun) {
      return json({ message: `初回のため、今ある図面 ${fresh.length} 件を記録だけしました（通知なし）` });
    }

    // 5) 案件ごとにまとめて1回投稿
    const byProject = new Map();
    for (const item of fresh) {
      const key = item.project.id;
      if (!byProject.has(key)) byProject.set(key, { project: item.project, files: [] });
      byProject.get(key).files.push(item.file);
    }
    const results = [];
    for (const { project, files } of byProject.values()) {
      const label = formatProjectNumber(project.prefix, project.ad_number);
      const lines = files.map((f) => `・${f.name}\n${f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`}`);
      const text = `${label} に図面が追加されました\n${lines.join("\n")}`;

      await sql`
        INSERT INTO project_activities (project_id, activity_type, description)
        VALUES (${project.id}, 'drawing_added', ${`図面が追加されました：${files.map((f) => f.name).join("、")}`})
      `.catch((e) => console.error("活動ログの記録に失敗:", e));

      const { space } = await findProjectSpace(project.prefix, project.ad_number);
      if (!space) {
        results.push({ project: label, files: files.length, posted: false, reason: "Chatスペースが見つかりません" });
        continue;
      }
      try {
        await postToSpace(space.name, text);
        results.push({ project: label, files: files.length, posted: true, space: space.displayName });
      } catch (e) {
        // 投稿に失敗したら、次回もう一度送れるよう記録を消す
        for (const f of files) await sql`DELETE FROM drawing_seen WHERE file_id = ${f.id}`;
        results.push({ project: label, files: files.length, posted: false, reason: String(e.message || e) });
      }
    }
    return json({ message: results.length ? "通知しました" : "新しい図面はありません", results });
  } catch (error) {
    console.error("図面の通知エラー:", error);
    return json({ error: "図面の確認に失敗しました", detail: String(error.message || error) }, 500);
  }
}
