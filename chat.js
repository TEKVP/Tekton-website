(function () {
  'use strict';

  // Google Apps Script Proxy Endpoint URL
  var PROXY_URL = 'https://script.google.com/macros/s/AKfycbxTDVLx_2cz4FPchH8sOONCNb4uXlEpGHI70f4OZfkEPpptj-k6CC0kfwbP5eZDAK8/exec';

  var fabBtn = document.getElementById('aiFabBtn');
  var liftModal = document.getElementById('aiLiftModal');
  var closeBtn = document.getElementById('aiChatClose');
  var log = document.getElementById('aiChatLog');
  var form = document.getElementById('aiChatForm');
  var input = document.getElementById('aiChatInput');
  var suggestions = document.getElementById('aiSuggestions');

  if (!fabBtn || !liftModal) return;

  var history = [];

  // Open lift doors animation
  function openLiftChat() {
    liftModal.classList.add('is-active');
    setTimeout(function () {
      liftModal.classList.add('doors-open');
    }, 100);
  }

  // Close lift doors animation
  function closeLiftChat() {
    liftModal.classList.remove('doors-open');
    setTimeout(function () {
      liftModal.classList.remove('is-active');
    }, 650);
  }

  fabBtn.addEventListener('click', openLiftChat);
  if (closeBtn) closeBtn.addEventListener('click', closeLiftChat);

  function appendMessage(role, text) {
    var msgDiv = document.createElement('div');
    msgDiv.className = 'tkmsg ' + (role === 'user' ? 'tkmsg--user' : 'tkmsg--bot');
    var bodyDiv = document.createElement('div');
    bodyDiv.className = 'tkmsg__body';
    bodyDiv.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
    msgDiv.appendChild(bodyDiv);
    log.appendChild(msgDiv);
    log.scrollTop = log.scrollHeight;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function sendQuery(queryText) {
    if (!queryText) return;

    appendMessage('user', queryText);
    history.push({ role: 'user', parts: [{ text: queryText }] });

    var loadingDiv = document.createElement('div');
    loadingDiv.className = 'tkmsg tkmsg--bot';
    loadingDiv.id = 'aiLoadingMsg';
    loadingDiv.innerHTML = '<div class="tkmsg__body"><em>Evaluating IS 14665 standard...</em></div>';
    log.appendChild(loadingDiv);
    log.scrollTop = log.scrollHeight;

    fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: history })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var loader = document.getElementById('aiLoadingMsg');
      if (loader) log.removeChild(loader);

      var reply = "Good day! I am unable to process that request right now. Please reach our executive engineering team at +91 89254 48131.";

      if (data && data.candidates && data.candidates[0] && data.candidates[0].content) {
        reply = data.candidates[0].content.parts[0].text;
        history.push({ role: 'model', parts: [{ text: reply }] });
      }

      appendMessage('bot', reply);
    })
    .catch(function () {
      var loader = document.getElementById('aiLoadingMsg');
      if (loader) log.removeChild(loader);
      appendMessage('bot', "Good day! I am experiencing connection difficulty. Please contact our desk at +91 89254 48131.");
    });
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = input.value.trim();
      if (text) {
        sendQuery(text);
        input.value = '';
      }
    });
  }

  if (suggestions) {
    suggestions.addEventListener('click', function (e) {
      if (e.target.tagName === 'BUTTON') {
        sendQuery(e.target.getAttribute('data-query'));
      }
    });
  }
})();