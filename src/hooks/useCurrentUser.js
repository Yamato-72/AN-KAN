import { useState, useEffect } from "react";

export function useCurrentUser() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);

      // API から全スタッフ情報を取得
      const response = await fetch("/api/staff");
      if (!response.ok) throw new Error("スタッフの取得に失敗しました");
      const allStaff = await response.json();

      // localStorage から選択された担当者を確認
      const selectedStaff = localStorage.getItem("selectedStaff");

      let currentStaffMember = null;

      if (selectedStaff) {
        try {
          const staffInfo = JSON.parse(selectedStaff);
          currentStaffMember = allStaff.find(
            (staff) => staff.id === staffInfo.id,
          );
        } catch (parseError) {
          console.warn("localStorageの担当者情報のパースに失敗:", parseError);
        }
      }

      // 担当者が選択されていない、または見つからない場合は、Pass権限のあるユーザーを自動選択
      if (!currentStaffMember) {
        currentStaffMember = allStaff.find((staff) => staff.passer);
        console.log("Pass権限のあるユーザーを自動選択:", currentStaffMember);
      }

      if (currentStaffMember) {
        setCurrentUser(currentStaffMember);
        // localStorageも更新
        localStorage.setItem(
          "selectedStaff",
          JSON.stringify({
            id: currentStaffMember.id,
            name: currentStaffMember.name,
            code: currentStaffMember.code,
          }),
        );
      } else {
        console.warn("利用可能な担当者が見つかりません");
      }
    } catch (err) {
      setError(err.message);
      console.error("ユーザー取得エラー:", err);
    } finally {
      setLoading(false);
    }
  };

  return { currentUser, loading, error, refetch: fetchCurrentUser };
}



