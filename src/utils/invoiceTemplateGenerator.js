// 請求書テンプレート生成ユーティリティ

/**
 * 今日の日付をYYYY/MM/DD形式で取得
 */
export const getTodayFormatted = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
};

/**
 * 次の月の末日をYYYY/MM/DD形式で取得
 */
export const getNextMonthEndDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // 次の月

  // 次の月の末日を計算（次の次の月の1日から1日引く）
  const nextMonth = new Date(year, month + 1, 0);

  const endYear = nextMonth.getFullYear();
  const endMonth = String(nextMonth.getMonth() + 1).padStart(2, "0");
  const endDay = String(nextMonth.getDate()).padStart(2, "0");

  return `${endYear}/${endMonth}/${endDay}`;
};

/**
 * 請求書テンプレート文字列を生成
 */
export const generateInvoiceTemplate = (project) => {
  const sendDate = getTodayFormatted();
  const paymentDueDate = getNextMonthEndDate();

  return `AD番号：AD-${project.ad_number || project.id}
顧客正式名：${project.client_name || ""}
請求先住所、部署、担当者名（担当者名があれば）：${project.company_address || project.address || ""}${project.contact_person ? " " + project.contact_person : ""}
請求書送付希望日または発行希望日：${sendDate}
入金予定日：${paymentDueDate}
請求書送付方法（メール・郵送・PDF）：PDF
見積分番号（MF見積番号：`;
};

/**
 * 請求書テンプレートフォームのデフォルト値を取得
 */
export const getDefaultInvoiceFormData = (project) => {
  return {
    adNumber: `AD-${project.ad_number || project.id}`,
    customerName: project.client_name || "",
    billingAddress: project.company_address || project.address || "",
    contactPerson: project.contact_person || "",
    sendDate: getTodayFormatted(),
    paymentDueDate: getNextMonthEndDate(),
    sendMethod: "PDF",
    estimateNumber: "",
  };
};



