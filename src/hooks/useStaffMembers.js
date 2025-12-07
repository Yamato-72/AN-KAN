import { useState, useEffect } from "react";

export function useStaffMembers() {
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStaffMembers();
  }, []);

  const fetchStaffMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/staff");
      if (!response.ok) throw new Error("スタッフの取得に失敗しました");
      const data = await response.json();
      setStaffMembers(data);
    } catch (err) {
      setError(err.message);
      console.error("スタッフ取得エラー:", err);
    } finally {
      setLoading(false);
    }
  };

  return { staffMembers, loading, error, refetch: fetchStaffMembers };
}



