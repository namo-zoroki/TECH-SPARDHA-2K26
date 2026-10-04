/**
 * TECHSPARDHA 2K26 - Backend Script (Google Apps Script)
 * 
 * Instructions:
 * 1. Create a Google Sheet with tabs: "Registrations", "Participants", "Events", "Payments", "Admin_Log".
 * 2. In Google Sheets, go to Extensions -> Apps Script.
 * 3. Paste this code.
 * 4. Configure DRIVE_FOLDER_ID with your Google Drive folder ID (where payment screenshots will be stored).
 * 5. Deploy as Web App (Execute as: Me, Who has access: Anyone).
 * 6. Copy the Web App URL and set it as VITE_GAS_API_URL in your .env.
 */

const DRIVE_FOLDER_ID = "1e4rXSinZyCKCU-X3dTuQpjhf3ROnbetX";

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // 10s timeout
    
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === "register") {
      return handleRegistration(data);
    } else if (action === "get_registrations") {
      return handleGetRegistrations(data);
    } else if (action === "update_status") {
      return handleUpdateStatus(data);
    }
    
    return response({ success: false, error: "INVALID_ACTION", message: "Invalid action provided" });
    
  } catch (err) {
    return response({ success: false, error: "SERVER_ERROR", message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function handleRegistration(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const regSheet = ss.getSheetByName("Registrations");
  const partSheet = ss.getSheetByName("Participants");
  if (!regSheet || !partSheet) {
    return response({ success: false, error: "SHEET_NOT_FOUND", message: "Required tabs (Registrations/Participants) are missing." });
  }
  
  const studentId = data.studentId.trim().toUpperCase();
  const email = data.email.trim().toLowerCase();
  const eventId = String(data.eventId || "").trim();
  const participantId = `${studentId}_${email}`;
  
  // 1. Check for duplicate registration for same event
  const regData = regSheet.getDataRange().getValues();
  const duplicate = regData.some(row => row[2] === participantId && row[10] === eventId);
  if (duplicate) {
    return response({ success: false, error: "DUPLICATE_EVENT", message: "You are already registered for this event." });
  }
  
  // 2. Check 2-event limit
  const partData = partSheet.getDataRange().getValues();
  let participantRow = -1;
  let eventCount = 0;
  
  for (let i = 1; i < partData.length; i++) {
    if (partData[i][0] === participantId) {
      participantRow = i + 1;
      eventCount = parseInt(partData[i][5]);
      break;
    }
  }
  
  if (eventCount >= 2) {
    return response({ success: false, error: "MAX_EVENT_LIMIT", message: "You have reached the maximum registration limit of 2 events." });
  }
  
  // 3. Handle Payment Screenshot if Gamer Fiesta (Event 08)
  const isGamerFiesta = eventId === "08";
  const paymentRequired = isGamerFiesta;
  const paymentAmount = isGamerFiesta ? 200 : 0;
  let screenshotUrl = "";
  if (isGamerFiesta && data.paymentScreenshot) {
    try {
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      const contentType = data.paymentScreenshot.type;
      const base64Data = data.paymentScreenshot.base64.split(',')[1];
      const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), contentType, `Payment_${participantId}_${eventId}`);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      screenshotUrl = file.getUrl();
    } catch (err) {
      return response({ success: false, error: "UPLOAD_FAILED", message: "Failed to upload payment screenshot. Please try again." });
    }
  } else if (isGamerFiesta) {
    return response({ success: false, error: "PAYMENT_REQUIRED", message: "Payment screenshot is required for Gamer Fiesta 2.0." });
  }
  
  // 4. Generate Registration ID
  const regId = `TS26-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const timestamp = Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd HH:mm:ss");
  
  // 5. Save to Registrations
  regSheet.appendRow([
    regId,
    timestamp,
    participantId,
    data.fullName,
    email,
    data.phone,
    data.college,
    studentId,
    data.year,
    data.branch,
    eventId,
    data.eventName,
    data.category,
    data.format,
    data.teamName || "N/A",
    data.teamCaptain || "N/A",
    JSON.stringify(data.teamMembers || []),
    data.teamSize || 1,
    paymentRequired ? "Yes" : "No",
    paymentAmount,
    paymentRequired ? "Pending Verification" : "Verified",
    screenshotUrl,
    "Submitted",
    "Pending"
  ]);
  
  // 6. Update/Create Participant record
  if (participantRow === -1) {
    partSheet.appendRow([participantId, data.fullName, email, data.phone, studentId, 1, eventId]);
  } else {
    // Ensure the value is treated as a string before splitting
    const rawEvents = partData[participantRow - 1][6];
    const existingEvents = rawEvents ? String(rawEvents).split(",") : [];
    existingEvents.push(eventId);
    partSheet.getRange(participantRow, 6).setValue(eventCount + 1);
    partSheet.getRange(participantRow, 7).setValue(existingEvents.join(","));
  }
  
  return response({
    success: true,
    registrationId: regId,
    message: "Registration successful!",
    event: data.eventName,
    paymentStatus: paymentRequired ? "Pending Verification" : "Verified"
  });
}

function handleGetRegistrations(data) {
  // Simple check for "admin password" - in real app, use better auth
  if (data.password !== "TECHSPARDHA_ADMIN_2026") {
    return response({ success: false, error: "AUTH_FAILED", message: "Unauthorized access" });
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const regSheet = ss.getSheetByName("Registrations");
  const values = regSheet.getDataRange().getValues();
  const headers = values[0];
  const rows = values.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h.toString().replace(/\s+/g, '')] = row[i]);
    return obj;
  });
  
  return response({ success: true, data: rows });
}

function handleUpdateStatus(data) {
  if (data.password !== "TECHSPARDHA_ADMIN_2026") {
    return response({ success: false, error: "AUTH_FAILED", message: "Unauthorized access" });
  }
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const regSheet = ss.getSheetByName("Registrations");
  const logSheet = ss.getSheetByName("Admin_Log");
  const regData = regSheet.getDataRange().getValues();
  
  let rowIndex = -1;
  for (let i = 1; i < regData.length; i++) {
    if (regData[i][0] === data.registrationId) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex !== -1) {
    if (data.field === "PaymentStatus") {
      regSheet.getRange(rowIndex, 21).setValue(data.value);
    } else if (data.field === "RegistrationStatus") {
      regSheet.getRange(rowIndex, 23).setValue(data.value);
    }
    
    logSheet.appendRow([
      Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd HH:mm:ss"),
      "Admin",
      `Update ${data.field}`,
      data.registrationId,
      data.remarks || ""
    ]);
    
    return response({ success: true, message: "Status updated successfully" });
  }
  
  return response({ success: false, error: "NOT_FOUND", message: "Registration not found" });
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return response({ success: true, message: "TechSpardha 2K26 API is online" });
}
