export async function GET() {
  try {
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

    const debugInfo = {
      hasServiceAccountKey: !!serviceAccountKey,
      serviceAccountKeyLength: serviceAccountKey ? serviceAccountKey.length : 0,
      hasParentFolderId: !!parentFolderId,
      parentFolderId: parentFolderId || null,
      timestamp: new Date().toISOString(),
    };

    // Try to parse service account key if it exists
    if (serviceAccountKey) {
      try {
        const parsed = JSON.parse(serviceAccountKey);
        debugInfo.serviceAccountEmail = parsed.client_email;
        debugInfo.serviceAccountProjectId = parsed.project_id;
        debugInfo.hasPrivateKey = !!parsed.private_key;
        debugInfo.privateKeyLength = parsed.private_key
          ? parsed.private_key.length
          : 0;
      } catch (parseError) {
        debugInfo.parseError = parseError.message;
      }
    }

    return Response.json({
      status: "debug_info",
      data: debugInfo,
    });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    console.log("=== Google Drive Debug Test ===");

    // Check environment variables first
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

    const envCheck = {
      hasServiceAccountKey: !!serviceAccountKey,
      serviceAccountKeyLength: serviceAccountKey ? serviceAccountKey.length : 0,
      hasParentFolderId: !!parentFolderId,
      parentFolderId: parentFolderId || "NOT SET",
    };

    console.log("Environment check:", envCheck);

    // Test parsing service account key
    let parseTest = null;
    if (serviceAccountKey) {
      try {
        const parsed = JSON.parse(serviceAccountKey);
        parseTest = {
          canParse: true,
          hasClientEmail: !!parsed.client_email,
          hasPrivateKey: !!parsed.private_key,
          clientEmail: parsed.client_email,
        };
      } catch (error) {
        parseTest = {
          canParse: false,
          error: error.message,
        };
      }
    }

    // Import the Google Drive functions
    const { createGoogleDriveFolder, checkParentFolderAccess } = await import(
      "../../utils/googleDrive.js"
    );

    // Check parent folder access first
    console.log("Checking parent folder access...");
    const parentFolderCheck = await checkParentFolderAccess();
    console.log("Parent folder check result:", parentFolderCheck);

    // Test creating a folder
    const testFolderName = `テストフォルダ_${Date.now()}`;
    console.log(`Testing Google Drive folder creation: ${testFolderName}`);

    const result = await createGoogleDriveFolder(testFolderName);

    return Response.json({
      status: "test_result",
      environmentCheck: envCheck,
      serviceAccountParseTest: parseTest,
      parentFolderCheck,
      testFolderName,
      result,
      diagnosis: result.success
        ? "Google Drive working correctly"
        : "Google Drive credentials not properly configured",
      nextSteps: result.success
        ? parentFolderCheck.isWarning
          ? [
              "Google Drive integration is working!",
              "⚠️ 親フォルダの直接アクセスはできませんが、フォルダ作成は正常に動作しています",
              "より詳細な権限が必要な場合は、サービスアカウントに親フォルダの閲覧権限を付与してください",
            ]
          : ["Google Drive integration is working perfectly!"]
        : [
            "Check that GOOGLE_SERVICE_ACCOUNT_KEY is set",
            "Check that GOOGLE_DRIVE_PARENT_FOLDER_ID is set",
            "Verify service account key format is valid JSON",
            "Ensure service account has access to Google Drive API",
            "Check if parent folder exists and service account has access",
          ],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Test folder creation error:", error);
    return Response.json(
      {
        status: "test_error",
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}


