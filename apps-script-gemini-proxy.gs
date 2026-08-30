/**
 * TEKTON ELEVATORS — Gemini proxy + Google Sheets lead collector
 *
 * Script properties required:
 *   GEMINI_API_KEY       = Gemini API key
 *   LEAD_SPREADSHEET_ID  = Google Sheet ID
 *   LEAD_SHEET_NAME      = optional, defaults to CRM_Leads
 *
 * Deploy as Web app: Execute as Me, Who has access: Anyone.
 */
var MODEL = 'gemini-2.5-flash';
var DEFAULT_SHEET = 'CRM_Leads';
var MAX_TURNS = 16;
var MAX_CHARS = 800;

var SYSTEM_PROMPT = [
  'You are "Tekton Assist", the official website assistant for Tekton Elevators,',
  'an elevator and escalator manufacturer based in Kovilpatti, Tamil Nadu, India.',
  '',
  'TONE AND MANNER:',
  '- Always be courteous, warm, patient and professional. Address the visitor respectfully.',
  '- Use plain, calm language. Never be pushy, never use hype, never use slang or emojis.',
  '- Reply in the language the visitor writes in, including Tamil.',
  '- Keep answers short and readable: 2 to 5 short sentences, or a few bullet points.',
  '',
  'LEAD COLLECTION:',
  '- Help visitors understand Tekton products and guide them toward a site survey or quotation.',
  '- Never invent or estimate a price, discount, delivery date or completion date.',
  '- When a visitor wants a quotation, ask them to use the Get a quote form so their name, phone,',
  '  email and site location can be recorded for the Tekton team.',
  '',
  'SAFETY:',
  '- Never give instructions for repairing, servicing, opening or overriding a lift.',
  '- If someone reports a person trapped inside a lift or an emergency, tell them to call',
  '  +91 89254 48131 immediately and not to force the doors open.',
  '',
  'SCOPE:',
  '- Answer questions about elevators, escalators, home lifts, shaft and pit planning, capacity,',
  '  safety, standards, modernisation, maintenance and Tekton itself.',
  '- For unrelated topics, politely explain that you only assist with Tekton and lift enquiries.',
  '',
  'COMPANY INFORMATION — use only these facts:',
  'Name: Tekton Elevators. Website: www.tektonelevators.com',
  'Experience: over 20 years of engineering experience; 300+ installations;',
  'IS 14665-1 compliant execution; 24/7 rescue support; Auto Rescue Device equipped.',
  'Head office: No. 32, Kathiresan Kovil 3rd Street, Veeravanchi Nagar, Kovilpatti, Tuticorin District, Tamil Nadu 628 501.',
  'Branch: 1/235-2, South Street, Kadanganeri, Tenkasi, Tamil Nadu 627 854.',
  'Also serving Chennai and Bengaluru.',
  'Phone: +91 89254 48131 and +91 95001 58530. Email: info@tektonelevators.com',
  'Products: home/villa lifts, commercial passenger elevators, hospital and stretcher lifts,',
  'goods and freight lifts, escalators, machine-room-less and machine-room traction systems,',
  'and hydraulic lifts for low-rise buildings.',
  'Capabilities: custom cabin design and finishes, modernisation and retrofitting of existing',
  'lifts of any make, IoT condition monitoring, predictive maintenance, annual maintenance',
  'contracts, and 2D/3D shaft design before fabrication.',
  'Standard shaft planning rule: usable cabin width is clear shaft width minus 370 mm, and cabin',
  'depth is clear shaft depth minus 470 mm. Door options are centre-opening or two-panel',
  'side-opening, 600 to 1200 mm.',
  'Service process: enquiry, free site survey, engineering drawings and quotation, fabrication,',
  'installation and commissioning, then handover with AMC.'
].join('\n');

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    /* Lead form requests from the shared website chat. */
    if (body.action === 'lead' || body.sheetSource === 'CRM_Leads') {
      saveLead_(body);
      return json_({ ok: true });
    }

    var contents = sanitise_(body.contents);
    if (!contents.length) return json_({ error: 'No message received.' });

    var key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!key) return json_({ error: 'GEMINI_API_KEY script property is not set.' });

    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
              MODEL + ':generateContent?key=' + encodeURIComponent(key);
    var res = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      payload: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 700 }
      })
    });
    var data = JSON.parse(res.getContentText() || '{}');
    if (data.error) return json_({ error: data.error.message || 'Gemini error' });

    var reply = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      var parts = data.candidates[0].content.parts || [];
      for (var i = 0; i < parts.length; i++) reply += (parts[i].text || '');
    }
    reply = reply.trim();
    return reply ? json_({ reply: reply }) : json_({ error: 'Empty reply' });
  } catch (err) {
    return json_({ error: String(err) });
  }
}

function doGet() {
  var props = PropertiesService.getScriptProperties();
  return json_({
    status: 'Tekton Gemini proxy running',
    keyConfigured: !!props.getProperty('GEMINI_API_KEY'),
    sheetConfigured: !!props.getProperty('LEAD_SPREADSHEET_ID')
  });
}

function saveLead_(lead) {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('LEAD_SPREADSHEET_ID');
  if (!id) throw new Error('LEAD_SPREADSHEET_ID script property is not set.');

  var name = String(lead.clientName || '').trim();
  var phone = String(lead.clientPhone || '').trim();
  var city = String(lead.siteLocation || '').trim();
  if (!name || !phone || !city) throw new Error('Name, phone and site location are required.');

  var sheetName = props.getProperty('LEAD_SHEET_NAME') || DEFAULT_SHEET;
  var ss = SpreadsheetApp.openById(id);
  var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);

  var headers = [
    'Timestamp','Source','Customer Name','Mobile','Email','Site Location','Requirement',
    'Page URL','Page Title','Shaft Width (mm)','Shaft Depth (mm)','Engineer Notes','Conversation'
  ];
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);

  sheet.appendRow([
    new Date(),
    String(lead.sheetSource || lead.source || 'Website'),
    name,
    phone,
    String(lead.clientEmail || '').trim(),
    city,
    String(lead.requirement || '').trim(),
    String(lead.pageUrl || '').slice(0, 1000),
    String(lead.pageTitle || '').slice(0, 300),
    lead.shaftWidth || '',
    lead.shaftDepth || '',
    String(lead.engineerNotes || '').slice(0, 1500),
    String(lead.conversation || '').slice(-6000)
  ]);
}

function sanitise_(contents) {
  if (!contents || !contents.length) return [];
  var out = [];
  var start = Math.max(0, contents.length - MAX_TURNS);
  for (var i = start; i < contents.length; i++) {
    var c = contents[i] || {};
    var role = (c.role === 'model') ? 'model' : 'user';
    var text = '';
    if (c.parts && c.parts.length) {
      for (var j = 0; j < c.parts.length; j++) text += (c.parts[j].text || '');
    }
    text = String(text).trim().slice(0, MAX_CHARS);
    if (text) out.push({ role: role, parts: [{ text: text }] });
  }
  return out;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
