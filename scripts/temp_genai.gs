var GOOGLE_GENAI_API_KEY = 'AIzaSyDCXB0NTyJCuj4nbejUGjf_atxMrIRBqH4';

// System prompt instructing the model about Morgann Music AI behavior
var MMCP_SYSTEM_PROMPT = "Tu es Morgann Music AI, un assistant intégré à Morgann Music CP, un distributeur musical. Aide les artistes en fournissant des conseils, des idées de pitch, des paroles et des recommandations de production. Si l'utilisateur a des questions administratives, dirige-le vers https://support.mm-cp.uk/ pour assistance supplémentaire. Réponds en français et sois professionnel et bienveillant.";

function generateFromGenAI(userPrompt, model) {
  model = model || 'models/gemini-3';
  var url = 'https://generativelanguage.googleapis.com/v1/' + model + ':generate?key=' + GOOGLE_GENAI_API_KEY;

  // Merge system prompt and user prompt into a single prompt text
  var finalPrompt = MMCP_SYSTEM_PROMPT + "\n\nUtilisateur: " + String(userPrompt || '');

  var payload = {
    prompt: { text: finalPrompt },
    maxOutputTokens: 512,
    temperature: 0.2
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var res = UrlFetchApp.fetch(url, options);
  var code = res.getResponseCode();
  var body = res.getContentText();
  if (code >= 200 && code < 300) {
    try {
      var obj = JSON.parse(body);
      // Try common fields returned by GenAI APIs
      if (obj && obj.candidates && obj.candidates.length) return obj.candidates[0].content;
      if (obj && obj.output && obj.output.length) return obj.output.map(function(o){ return o.content; }).join('\n');
      if (obj && obj.result && obj.result.output && obj.result.output[0] && obj.result.output[0].content) return obj.result.output[0].content;
      return body;
    } catch (e) { return body; }
  }
  throw new Error('GenAI error ' + code + ': ' + body);
}

function doPost(e) {
  try {
    var data = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    var prompt = data.prompt || data.text || '';
    var model = data.model || undefined;
    var text = generateFromGenAI(prompt, model);
    return ContentService.createTextOutput(JSON.stringify({ ok: true, text: text })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  }
}
