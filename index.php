<?php


echo "test branche";
?>

<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#0b1220" />
  <title>EauTrack Rural</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="/css/style.css" />

  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script> <!-- [web:60] -->
</head>

<body>
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>
  <div class="blob blob-3"></div>

  <header class="header">
    <div class="container header__inner">
        <a class="brand" href="#/">
            <span class="brand__title">EauTrack Rural</span>
        </a>
      <a class="btn btn--ghost header__settings" href="#/settings">Settings</a>
    </div>
  </header>

  <main class="container main">
    <section id="app"></section>
  </main>

  <nav id="bottomNav" class="bottomnav bottomnav--hidden">
    <div class="container bottomnav__inner">
      <a class="pill" href="#/dashboard">Dashboard</a>
      <a class="pill" href="#/settings">Profile</a>
      <button id="btnLogout" class="pill pill--danger" type="button">Logout</button>
    </div>
  </nav>

  <!-- Toast -->
  <div id="toast" class="toast toast--hidden" aria-live="polite">
    <div class="container">
      <div id="toastBox" class="toast__box">
        <span id="toastDot" class="toast__dot" aria-hidden="true"></span>
        <div class="toast__content">
          <div id="toastTitle" class="toast__title">Info</div>
          <div id="toastMsg" class="toast__msg"></div>
        </div>
        <button id="toastClose" class="iconbtn" type="button" aria-label="Close">✕</button>
      </div>
    </div>
  </div>

  <!-- Modal -->
  <div id="modal" class="modal modal--hidden" role="dialog" aria-modal="true">
    <div class="modal__backdrop" data-action="modal-close"></div>
    <div class="container modal__wrap">
      <div class="modal__card">
        <div class="modal__row">
          <div id="modalIcon" class="modal__icon" aria-hidden="true">!</div>
          <div class="modal__body">
            <div id="modalTitle" class="modal__title">Alert</div>
            <div id="modalMsg" class="modal__msg"></div>
          </div>
        </div>
        <div class="modal__actions">
          <button id="modalOk" class="btn btn--primary" type="button" data-action="modal-ok">OK</button>
          <button id="modalClose" class="btn btn--ghost" type="button" data-action="modal-close">Close</button>
        </div>
      </div>
    </div>
  </div>

  <script src="/js/app.js"></script>
</body>
</html>
