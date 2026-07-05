"use client";

import { useEffect, useState } from "react";

// ============================================================
// この案件を編集できるか？（画面の出し分け用）
//   サーバー側の門番（authz.js）と同じルール：
//   - 本稼働前（見学モード）は従来通り全員OK
//   - 本稼働後：管理者 or 担当者本人だけOK
//   ※あくまで見た目の親切さ。本当の守りはサーバー側の門番
// ============================================================

export function useEditPermission(project) {
  const [canEdit, setCanEdit] = useState(true); // 判定前は従来通り表示

  useEffect(() => {
    if (!project) return;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null, enforce: false }))
      .then((me) => {
        if (!me.enforce) return setCanEdit(true); // 見学モード
        if (!me.user) return setCanEdit(false);
        if (me.user.isAdmin) return setCanEdit(true);
        setCanEdit(
          !!me.user.code &&
            me.user.code === project.assigned_team_member,
        );
      })
      .catch(() => setCanEdit(true));
  }, [project?.id, project?.assigned_team_member]);

  return canEdit;
}
