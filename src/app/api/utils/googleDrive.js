import { createSign } from "crypto";

// Google Drive API utilities

// Check if parent folder exists and is accessible
export async function checkParentFolderAccess() {
  try {
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

    if (!serviceAccountKey || !parentFolderId) {
      return {
        success: false,
        error: "Missing credentials or parent folder ID",
        isWarning: true,
      };
    }

    const credentials = JSON.parse(serviceAccountKey);
    const accessToken = await getAccessToken(credentials);

    // Try to get parent folder info with shared drive support
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${parentFolderId}?fields=id,name,parents,permissions,owners,webViewLink,capabilities,driveId&supportsAllDrives=true`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Parent folder check failed: ${response.status} - ${errorText}`,
        parentFolderId,
        serviceAccount: credentials.client_email,
        isSharedDrive: "unknown",
        isWarning: true, // Mark as warning instead of error
        suggestion:
          "親フォルダの直接アクセスはできませんが、フォルダ作成は可能です。サービスアカウントの権限を確認してください。",
      };
    }

    const folderInfo = await response.json();

    // Check if this is in a shared drive
    const isInSharedDrive = !!folderInfo.driveId;

    // If folder has parents, get parent folder info too
    let parentFolderInfo = null;
    if (folderInfo.parents && folderInfo.parents.length > 0) {
      try {
        const parentResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${folderInfo.parents[0]}?fields=id,name,parents,webViewLink,driveId&supportsAllDrives=true`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
        if (parentResponse.ok) {
          parentFolderInfo = await parentResponse.json();
        }
      } catch (e) {
        // Parent folder info is optional
      }
    }

    // Get shared drive info if applicable
    let sharedDriveInfo = null;
    if (isInSharedDrive) {
      try {
        const driveResponse = await fetch(
          `https://www.googleapis.com/drive/v3/drives/${folderInfo.driveId}?fields=id,name,capabilities`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
        if (driveResponse.ok) {
          sharedDriveInfo = await driveResponse.json();
        }
      } catch (e) {
        // Shared drive info is optional
      }
    }

    return {
      success: true,
      folderInfo,
      parentFolderInfo,
      sharedDriveInfo,
      serviceAccount: credentials.client_email,
      message: "Parent folder is accessible",
      isSharedDrive: isInSharedDrive,
      hierarchy: {
        isInSubfolder: !!folderInfo.parents,
        parentFolderId: folderInfo.parents?.[0],
        parentFolderName: parentFolderInfo?.name,
        sharedDriveName: sharedDriveInfo?.name,
        suggestion: isInSharedDrive
          ? "共有ドライブ内のフォルダです。サービスアカウントが適切な権限を持っているか確認してください。"
          : folderInfo.parents
            ? "フォルダがサブフォルダ内にあります。ルートレベルでの作成を推奨します。"
            : "フォルダはルートレベルにあります。",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      isWarning: true, // Mark as warning instead of error
    };
  }
}

export async function createGoogleDriveFolder(folderName) {
  let folderCreated = false;
  let createdFolderId = null;
  let createdFolderName = null;
  let webViewLink = null;

  try {
    console.log("Creating Google Drive folder for:", folderName);

    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

    console.log(
      "Environment check - Service Account Key exists:",
      !!serviceAccountKey,
    );
    console.log(
      "Environment check - Parent Folder ID exists:",
      !!parentFolderId,
    );

    if (!serviceAccountKey || !parentFolderId) {
      console.log("Google Drive not configured, using fallback");
      return {
        success: true,
        folderId: null,
        folderName: folderName,
        webViewLink: parentFolderId
          ? `https://drive.google.com/drive/folders/${parentFolderId}`
          : null,
        message:
          "Google Drive credentials not configured - please set up service account",
      };
    }

    // Parse service account key
    let credentials;
    try {
      credentials = JSON.parse(serviceAccountKey);
      console.log("Service account key parsed successfully");
    } catch (parseError) {
      console.error("Failed to parse service account key:", parseError);
      return {
        success: false,
        error: `Invalid service account key format: ${parseError.message}`,
        message: "サービスアカウントキーの形式が無効です",
      };
    }

    // Get access token using service account
    console.log("Getting access token...");
    let accessToken;
    try {
      accessToken = await getAccessToken(credentials);
      console.log("Access token obtained successfully");
    } catch (tokenError) {
      console.error("Failed to get access token:", tokenError);
      return {
        success: false,
        error: `Failed to get access token: ${tokenError.message}`,
        message: "アクセストークンの取得に失敗しました",
      };
    }

    // Create folder metadata
    const folderMetadata = {
      name: folderName,
      parents: [parentFolderId],
      mimeType: "application/vnd.google-apps.folder",
    };

    console.log("Creating folder with metadata:", folderMetadata);

    // Create folder in Google Drive
    const response = await fetch(
      "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(folderMetadata),
      },
    );

    console.log("Google Drive API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Drive API error response:", errorText);

      // Check if it's a duplicate folder error (folder already exists)
      if (response.status === 409 || errorText.includes("already exists")) {
        console.log("Folder may already exist, checking existing folders...");

        try {
          // Search for existing folder with same name
          const searchResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(folderName)}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder'&supportsAllDrives=true`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );

          if (searchResponse.ok) {
            const searchResult = await searchResponse.json();
            if (searchResult.files && searchResult.files.length > 0) {
              const existingFolder = searchResult.files[0];
              console.log("Found existing folder:", existingFolder);

              return {
                success: true,
                folderId: existingFolder.id,
                folderName: existingFolder.name,
                webViewLink: `https://drive.google.com/drive/folders/${existingFolder.id}`,
                message: "同名のフォルダが既に存在していました（使用可能）",
                isExisting: true,
              };
            }
          }
        } catch (searchError) {
          console.error("Error searching for existing folder:", searchError);
        }
      }

      return {
        success: false,
        error: `Google Drive API error: ${response.status} - ${errorText}`,
        webViewLink: parentFolderId
          ? `https://drive.google.com/drive/folders/${parentFolderId}`
          : null,
        message: `フォルダ作成APIエラー（${response.status}）`,
      };
    }

    // At this point, the API call was successful - mark folder as created
    folderCreated = true;
    console.log("✅ Google Drive API call successful, parsing response...");

    let result;
    try {
      result = await response.json();
      console.log("✅ Response parsed successfully:", result);

      // Extract created folder details
      createdFolderId = result.id;
      createdFolderName = result.name;
      webViewLink = `https://drive.google.com/drive/folders/${result.id}`;

      console.log("✅ Folder details extracted:", {
        id: createdFolderId,
        name: createdFolderName,
        webViewLink,
      });
    } catch (parseError) {
      console.error("⚠️ Error parsing response JSON:", parseError);
      // Even if parsing fails, the folder was created (API returned 200/201)
      return {
        success: true,
        folderId: null, // We don't have the ID due to parse error
        folderName: folderName,
        webViewLink: parentFolderId
          ? `https://drive.google.com/drive/folders/${parentFolderId}`
          : null,
        message:
          "フォルダは作成されましたが、詳細情報の取得でエラーが発生しました",
        warning: `Response parse error: ${parseError.message}`,
      };
    }

    console.log("✅ Google Drive folder creation completed successfully");

    return {
      success: true,
      folderId: result.id,
      folderName: result.name,
      webViewLink: webViewLink,
      message: "Google Driveフォルダが正常に作成されました",
    };
  } catch (error) {
    console.error("Error creating Google Drive folder:", {
      message: error.message,
      folderName,
      folderCreated,
      createdFolderId,
    });

    // If folder was created but there was a subsequent error, still return success
    if (folderCreated && createdFolderId) {
      console.log("Folder was created despite error, returning success");
      return {
        success: true,
        folderId: createdFolderId,
        folderName: createdFolderName,
        webViewLink: webViewLink,
        message: "フォルダは作成されました（一部警告あり）",
        warning: error.message,
      };
    }

    return {
      success: false,
      error: error.message,
      webViewLink: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID
        ? `https://drive.google.com/drive/folders/${process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID}`
        : null,
      message: "フォルダ自動作成に失敗しました。手動で作成してください。",
    };
  }
}

async function getAccessToken(credentials) {
  try {
    console.log("Creating JWT token...");

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // 1 hour expiration

    // Create JWT payload
    const payload = {
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/drive.file",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: exp,
    };

    // Create JWT token
    const token = createJWT(payload, credentials.private_key);
    console.log("JWT token created successfully");

    // Exchange JWT for access token
    console.log("Exchanging JWT for access token...");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: token,
      }),
    });

    console.log("Token exchange response status:", tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange error response:", errorText);
      throw new Error(
        `Token exchange failed: ${tokenResponse.status} - ${errorText}`,
      );
    }

    const tokenData = await tokenResponse.json();
    console.log("Access token obtained successfully");
    return tokenData.access_token;
  } catch (error) {
    console.error("Error in getAccessToken:", error);
    throw error;
  }
}

function createJWT(payload, privateKey) {
  // JWT Header
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  // Base64URL encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  // Create signature input
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Sign using Node.js crypto
  const sign = createSign("RSA-SHA256");
  sign.update(signatureInput);
  sign.end();

  const signature = sign.sign(privateKey);
  const encodedSignature = base64UrlEncode(signature);

  return `${signatureInput}.${encodedSignature}`;
}

function base64UrlEncode(str) {
  // Convert string or buffer to base64url
  let buffer;
  if (typeof str === "string") {
    buffer = Buffer.from(str, "utf8");
  } else {
    buffer = Buffer.from(str);
  }

  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}



