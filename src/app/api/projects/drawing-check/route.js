import sql from "@/app/api/utils/sql";
import { autoAdvanceToArranging, autoAdvanceSp, syncProductNumbers } from "@/app/api/utils/autoArrange";
import { findProjectSpace, postToSpace, getServiceToken } from "@/app/api/utils/googleChat";
import { formatProjectNumber } from "@/lib/prefixes";

// ============================================================
// 案件フォルダに図面・PL/CI が入ったら、案件の Google Chat スペースへ知らせる窓口
//   - GAS（時間主導トリガー）が10分おきに GET / POST で呼ぶ。だれが何回呼んでも同じ結果になる
//   - サービスアカウントで Drive を検索し、直近3日に追加・変更されたファイルのうち
//     名前で種類を見分ける（KINDS）：図面 / drawing、PL / CI / packing list / commercial invoice
//   - そのファイルが、AN-KAN が作った案件フォルダ（projects.drive_folder_id）の中
//     または手動で貼ったフォルダリンクの中（下の階層でもOK）にあれば、その案件のスペースに1回だけ投稿する
//   - 通知済みのファイルは drawing_seen 表に覚える。初めて動かしたときは
//     「今あるもの」を覚えるだけで投稿しない（過去の図面がまとめて流れないように）
//   - ?dry=1 を付けると、投稿も記録もせずに「何が見つかったか」だけ返す（確認用）
// ============================================================

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
// 名前で見分ける書類の種類（上から順に判定）
//   PL / CI は大文字の単語として入っているときだけ（例 AD1844_PL.pdf、CI AD-1844.pdf）
const KINDS = [
  {
    key: "shipping",
    reStrict: /(^|[^A-Za-z])(PL|CI)([^A-Za-z]|$)/, // PL/CI は大文字だけ
    reWords: /packing\s*list|commercial\s*invoice|パッキングリスト/i,
    title: "国際配送の手配が完了しました（PL・CIが届きました）",
    log: "PL・CIが追加されました",
  },
  {
    key: "drawing",
    reWords: /図面|drawing/i,
    title: "図面が追加されました",
    log: "図面が追加されました",
  },
];
function kindOf(name) {
  return KINDS.find((k) => (k.reStrict && k.reStrict.test(name)) || k.reWords.test(name)) || null;
}
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
      kind TEXT NOT NULL DEFAULT 'drawing',
      prefix TEXT,
      number INTEGER,
      seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE drawing_seen ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'drawing'`;
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
    // 見張り用：GASから呼ばれた時刻を残す（/api/watch が「止まっていないか」を見る）
    if (!dry) {
      await sql`CREATE TABLE IF NOT EXISTS watch_heartbeat (name TEXT PRIMARY KEY, at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
      await sql`INSERT INTO watch_heartbeat (name, at) VALUES ('drawing-check', NOW()) ON CONFLICT (name) DO UPDATE SET at = NOW()`;
    }
    // 0) ついでに：受注済み → 手配中 の自動切り替え（支払い済み・引当あり）
    let arranged = [];
    try {
      arranged = await autoAdvanceToArranging({ dry });
    } catch (e) {
      console.error("手配中への自動切り替えに失敗:", e.message);
    }
    // 0b) SP（在庫の発注）：手配中へ寄せる／全部検品済みなら検品完了
    let spMoved = [];
    try {
      spMoved = await autoAdvanceSp({ dry });
    } catch (e) {
      console.error("SPの自動切り替えに失敗:", e.message);
    }
    // 0c) 支払ナビで付いた製品番号（YS番号）をAN-KANへ返す
    let productNumbers = [];
    try {
      productNumbers = await syncProductNumbers({ dry: true }); // いったん確認のみ（製品番号欄は型式に使われているため、書き込みは止めている）
    } catch (e) {
      console.error("製品番号の取り込みに失敗:", e.message);
    }

    // 1) 案件フォルダの一覧（フォルダID → 案件）
    //    AN-KANが作ったフォルダ（drive_folder_id）に加えて、
    //    過去案件で手動・CSVで貼ったフォルダのリンク（…/folders/<ID>）も対象にする
    const projects = await sql`
      SELECT id, COALESCE(prefix, 'AD') AS prefix, ad_number, drive_folder_id, drive_folder_link
      FROM projects
      WHERE COALESCE(drive_folder_id, '') <> '' OR COALESCE(drive_folder_link, '') <> ''
    `;
    const folderToProject = new Map();
    for (const p of projects) {
      if (p.drive_folder_id) folderToProject.set(p.drive_folder_id, p);
      const m = String(p.drive_folder_link || "").match(/\/folders\/([A-Za-z0-9_-]+)/);
      if (m && !folderToProject.has(m[1])) folderToProject.set(m[1], p);
    }

    // 2) 名前に「図面 / drawing」が入った最近のファイル
    const token = await getServiceToken(DRIVE_SCOPE);
    const candidates = (await listRecentFiles(token))
      .map((f) => ({ ...f, kind: kindOf(f.name || "") }))
      .filter((f) => f.kind);

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
        arranged,
        spMoved,
        productNumbers,
        found: found.map(({ file, project }) => ({ project: formatProjectNumber(project.prefix, project.ad_number), kind: file.kind.key, name: file.name })),
      });
    }

    // 4) まだ通知していないものだけ残す（初回は覚えるだけ）
    await ensureTable();
    // 種類ごとに「初めて動いた回」を判定（その回は覚えるだけで投稿しない）
    const counts = await sql`SELECT kind, COUNT(*)::int AS n FROM drawing_seen GROUP BY kind`;
    const seenKinds = new Set(counts.filter((r) => Number(r.n) > 0).map((r) => r.kind));
    const fresh = [];
    let recordedOnly = 0;
    for (const item of found) {
      const ins = await sql`
        INSERT INTO drawing_seen (file_id, file_name, kind, prefix, number)
        VALUES (${item.file.id}, ${item.file.name}, ${item.file.kind.key}, ${item.project.prefix}, ${item.project.ad_number})
        ON CONFLICT (file_id) DO NOTHING
        RETURNING file_id
      `;
      if (!ins.length) continue;
      if (seenKinds.has(item.file.kind.key)) fresh.push(item);
      else recordedOnly++;
    }

    // 5) 案件×種類ごとにまとめて1回投稿
    const byProject = new Map();
    for (const item of fresh) {
      const key = `${item.project.id}:${item.file.kind.key}`;
      if (!byProject.has(key)) byProject.set(key, { project: item.project, kind: item.file.kind, files: [] });
      byProject.get(key).files.push(item.file);
    }
    const results = [];
    for (const { project, kind, files } of byProject.values()) {
      const label = formatProjectNumber(project.prefix, project.ad_number);
      const lines = files.map((f) => `・${f.name}\n${f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`}`);
      const text = `${label} ${kind.title}\n${lines.join("\n")}`;

      await sql`
        INSERT INTO project_activities (project_id, activity_type, description)
        VALUES (${project.id}, ${kind.key === "drawing" ? "drawing_added" : "shipping_docs_added"}, ${`${kind.log}：${files.map((f) => f.name).join("、")}`})
      `.catch((e) => console.error("活動ログの記録に失敗:", e));

      const { space } = await findProjectSpace(project.prefix, project.ad_number);
      if (!space) {
        results.push({ project: label, kind: kind.key, files: files.length, posted: false, reason: "Chatスペースが見つかりません" });
        continue;
      }
      try {
        await postToSpace(space.name, text);
        results.push({ project: label, kind: kind.key, files: files.length, posted: true, space: space.displayName });
      } catch (e) {
        // 投稿に失敗したら、次回もう一度送れるよう記録を消す
        for (const f of files) await sql`DELETE FROM drawing_seen WHERE file_id = ${f.id}`;
        results.push({ project: label, kind: kind.key, files: files.length, posted: false, reason: String(e.message || e) });
      }
    }
    return json({
      message: results.length ? "通知しました" : "新しい書類はありません",
      arranged: arranged.length ? arranged : undefined,
      spMoved: spMoved.length ? spMoved : undefined,
      productNumbers: productNumbers.length ? productNumbers.length : undefined,
      recordedOnly: recordedOnly ? `初回のため ${recordedOnly} 件は記録だけしました（通知なし）` : undefined,
      results,
    });
  } catch (error) {
    console.error("図面の通知エラー:", error);
    return json({ error: "図面の確認に失敗しました", detail: String(error.message || error) }, 500);
  }
}
